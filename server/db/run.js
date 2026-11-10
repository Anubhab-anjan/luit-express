require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run(fileName) {
  const filePath = path.resolve(__dirname, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log(`Executing ${fileName}...`);
    const res = await client.query(sql);
    console.log(`Successfully executed ${fileName}`);
    if (Array.isArray(res)) {
      const last = res[res.length - 1];
      if (last && last.rows && last.rows.length > 0) {
        console.table(last.rows);
      }
    }
  } catch (err) {
    console.error(`Error executing ${fileName}:`, err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node db/run.js <file.sql>');
  process.exit(1);
}
run(file);

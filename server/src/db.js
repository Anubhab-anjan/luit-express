const { Pool } = require('pg');
module.exports = new Pool({
  connectionString: process.env.DATABASE_URL,
  // RDS wants SSL; leave it off for local Postgres
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

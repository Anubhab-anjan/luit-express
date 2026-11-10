const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({ region: process.env.AWS_REGION });

// keeps a copy of every ticket in S3. Skipped when no bucket is set (local dev).
exports.saveTicket = async (booking) => {
  if (!process.env.S3_BUCKET) return;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `tickets/${booking.ref}.json`,
      Body: JSON.stringify(booking),
      ContentType: 'application/json',
    }));
  } catch (e) {
    console.error('ticket upload failed', e.message); // booking still stands
  }
};

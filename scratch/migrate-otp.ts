import { pool } from "../src/lib/db";

async function migrate() {
  console.log("Running user table OTP migrations...");
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS otp VARCHAR(10),
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true
    `);
    console.log("✔ OTP and Verification columns added to 'users' table.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();

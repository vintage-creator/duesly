import fs from "fs";
import path from "path";
import pg from "pg";

// Load env
try {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, "utf-8");
    for (const line of env.split("\n")) {
      const parts = line.split("=");
      if (parts.length >= 2) {
        process.env[parts[0].trim()] = parts.slice(1).join("=").trim();
      }
    }
  }
} catch (e) {
  console.error("Could not load .env file", e);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = pool;
  try {
    console.log("Starting security schema database migration...");

    // 1. Alter vendors table to add email and withdrawal_pin
    console.log("Altering vendors table columns...");
    await client.query(`
      ALTER TABLE vendors 
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS withdrawal_pin VARCHAR(4) DEFAULT NULL;
    `);

    // 2. Create audit_logs table
    console.log("Creating audit_logs table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        org_id VARCHAR(50),
        user_email VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        details TEXT,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Backfill vendor emails from users table
    console.log("Backfilling vendor emails from users table...");
    const backfillRes = await client.query(`
      UPDATE vendors v 
      SET email = u.email 
      FROM users u 
      WHERE LOWER(u.name) = LOWER(v.name) 
        AND u.org_id = v.org_id 
        AND u.role = 'vendor' 
        AND (v.email IS NULL OR v.email = '');
    `);
    console.log(`Backfilled ${backfillRes.rowCount || 0} vendor email records.`);

    console.log("Security migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

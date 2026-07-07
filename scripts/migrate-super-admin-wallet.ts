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
    console.log("Starting Super Admin profit wallet schema migration...");

    // 1. Create super_admin_wallet table
    console.log("Creating super_admin_wallet table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS super_admin_wallet (
        balance NUMERIC(12,2) NOT NULL DEFAULT 0,
        saved_bank_name VARCHAR(255) DEFAULT NULL,
        saved_account_number VARCHAR(10) DEFAULT NULL,
        saved_account_name VARCHAR(255) DEFAULT NULL
      );
    `);

    // 2. Initialize profit wallet row if empty
    console.log("Initializing profit wallet balance...");
    await client.query(`
      INSERT INTO super_admin_wallet (balance) 
      SELECT 0 
      WHERE NOT EXISTS (SELECT 1 FROM super_admin_wallet);
    `);

    // 3. Add fee column to payments table
    console.log("Adding fee column to payments table...");
    await client.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS fee NUMERIC(12,2) NOT NULL DEFAULT 0;
    `);

    console.log("Super Admin wallet migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

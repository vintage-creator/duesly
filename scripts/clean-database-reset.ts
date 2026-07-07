import { pool } from "../src/lib/db";

async function cleanReset() {
  console.log("=== Commencing Database Clean Reset ===");
  const client = await pool.connect();
  try {
    await client.query("BEGIN;");

    // Clean all transaction and ledger tables
    console.log("Truncating transaction data...");
    await client.query("TRUNCATE TABLE receipts CASCADE;");
    await client.query("TRUNCATE TABLE reconciliations CASCADE;");
    await client.query("TRUNCATE TABLE payments CASCADE;");
    await client.query("TRUNCATE TABLE vendors CASCADE;");
    await client.query("TRUNCATE TABLE dues_categories CASCADE;");
    await client.query("TRUNCATE TABLE users CASCADE;");
    await client.query("TRUNCATE TABLE organizations CASCADE;");

    // Seed ONLY the super admin user
    console.log("Seeding super admin...");
    await client.query(
      `INSERT INTO users (email, password, role, org_id, name, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6);`,
      ["chuksy3@gmail.com", "Duesly7817##**", "super-admin", null, "Chukwudi Super Admin", true]
    );

    await client.query("COMMIT;");
    console.log("=== Clean reset complete. Only Super Admin seeded! ===");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("Database clean reset failed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

cleanReset();

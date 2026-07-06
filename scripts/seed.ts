import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

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

const databaseUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/duesly";
console.log(`Connecting to database: ${databaseUrl}`);

const pool = new Pool({
  connectionString: databaseUrl,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Dropping tables if they exist...");
    await client.query("DROP TABLE IF EXISTS notifications CASCADE;");
    await client.query("DROP TABLE IF EXISTS users CASCADE;");
    await client.query("DROP TABLE IF EXISTS receipts CASCADE;");
    await client.query("DROP TABLE IF EXISTS reconciliations CASCADE;");
    await client.query("DROP TABLE IF EXISTS payments CASCADE;");
    await client.query("DROP TABLE IF EXISTS dues_categories CASCADE;");
    await client.query("DROP TABLE IF EXISTS vendors CASCADE;");
    await client.query("DROP TABLE IF EXISTS organizations CASCADE;");

    console.log("Creating tables...");

    await client.query(`
      CREATE TABLE organizations (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active'
      );
    `);

    await client.query(`
      CREATE TABLE users (
        email VARCHAR(255) PRIMARY KEY,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        org_id VARCHAR(50) REFERENCES organizations(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        otp VARCHAR(6),
        is_verified BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    await client.query(`
      CREATE TABLE vendors (
        id VARCHAR(50) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        shop VARCHAR(100) NOT NULL,
        phone VARCHAR(100) NOT NULL,
        section VARCHAR(255) NOT NULL,
        virtual_account VARCHAR(100) NOT NULL,
        due NUMERIC(12,2) NOT NULL DEFAULT 0,
        paid NUMERIC(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'unpaid'
      );
    `);

    await client.query(`
      CREATE TABLE dues_categories (
        id VARCHAR(50) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        frequency VARCHAR(50) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        vendors_count INT NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE payments (
        id VARCHAR(50) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
        vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE SET NULL,
        vendor_name VARCHAR(255) NOT NULL,
        account VARCHAR(100) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        category VARCHAR(255) NOT NULL,
        date VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE reconciliations (
        id VARCHAR(50) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
        source VARCHAR(100) NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        expected NUMERIC(12,2) NOT NULL,
        paid NUMERIC(12,2) NOT NULL,
        diff NUMERIC(12,2) NOT NULL,
        status VARCHAR(50) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE receipts (
        id VARCHAR(50) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
        vendor_name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        date VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE notifications (
        id VARCHAR(50) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
        vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Seeding organizations...");
    const orgs = [
      { id: "ORG-001", name: "Ariaria Market Association", type: "Market", status: "active" },
      { id: "ORG-002", name: "Lekki Phase 1 Estate", type: "Estate", status: "active" },
      { id: "ORG-003", name: "Onitsha Main Market Union", type: "Market", status: "active" },
      { id: "ORG-004", name: "Trans-Amadi Cooperative", type: "Cooperative", status: "active" },
      { id: "ORG-005", name: "Kano Leather Traders Assoc.", type: "Trade Group", status: "pending" },
      { id: "ORG-006", name: "Magodo Residents Forum", type: "Estate", status: "active" },
      { id: "ORG-007", name: "Abia State Transport Union", type: "Trade Group", status: "suspended" },
    ];

    for (const org of orgs) {
      await client.query(
        "INSERT INTO organizations (id, name, type, status) VALUES ($1, $2, $3, $4);",
        [org.id, org.name, org.type, org.status]
      );
    }

    console.log("Seeding users...");
    const users = [
      { email: "chuksy3@gmail.com", password: "Duesly7817##**", role: "super-admin", org_id: null, name: "Chukwudi Admin" },
      { email: "admin@ariaria.org", password: "password", role: "admin", org_id: "ORG-001", name: "Ariaria Admin" },
    ];

    for (const u of users) {
      await client.query(
        "INSERT INTO users (email, password, role, org_id, name) VALUES ($1, $2, $3, $4, $5);",
        [u.email, u.password, u.role, u.org_id, u.name]
      );
    }

    console.log("Seeding vendors...");
    const vendorsList = [
      { id: "V-1042", org_id: "ORG-001", name: "Chinedu Okafor", shop: "B-12", phone: "+234 803 412 9087", section: "Textile Line", virtual_account: "9032 4410 88", due: 18000, paid: 18000, status: "paid" },
      { id: "V-1043", org_id: "ORG-001", name: "Aisha Bello", shop: "C-04", phone: "+234 811 220 0098", section: "Provisions", virtual_account: "9032 4410 89", due: 18000, paid: 10000, status: "partial" },
      { id: "V-1044", org_id: "ORG-001", name: "Emeka Nwosu", shop: "A-21", phone: "+234 802 119 6633", section: "Electronics", virtual_account: "9032 4410 90", due: 24000, paid: 0, status: "unpaid" },
      { id: "V-1045", org_id: "ORG-001", name: "Funmi Adeyemi", shop: "D-09", phone: "+234 805 720 1144", section: "Cosmetics", virtual_account: "9032 4410 91", due: 18000, paid: 22000, status: "overpaid" },
      { id: "V-1046", org_id: "ORG-001", name: "Ibrahim Musa", shop: "E-17", phone: "+234 706 553 8821", section: "Grains", virtual_account: "9032 4410 92", due: 15000, paid: 15000, status: "paid" },
      { id: "V-1047", org_id: "ORG-001", name: "Ngozi Eze", shop: "B-08", phone: "+234 818 442 1109", section: "Textile Line", virtual_account: "9032 4410 93", due: 18000, paid: 5000, status: "partial" },
      { id: "V-1048", org_id: "ORG-001", name: "Tunde Bakare", shop: "F-02", phone: "+234 803 008 7766", section: "Hardware", virtual_account: "9032 4410 94", due: 20000, paid: 0, status: "unpaid" },
      { id: "V-1049", org_id: "ORG-001", name: "Halima Yusuf", shop: "C-15", phone: "+234 909 117 4422", section: "Provisions", virtual_account: "9032 4410 95", due: 18000, paid: 18000, status: "paid" },
      { id: "V-1050", org_id: "ORG-001", name: "Olu Adebayo", shop: "A-10", phone: "+234 812 661 2200", section: "Electronics", virtual_account: "9032 4410 96", due: 24000, paid: 24000, status: "paid" },
      { id: "V-1051", org_id: "ORG-001", name: "Kemi Lawal", shop: "D-14", phone: "+234 803 222 6655", section: "Cosmetics", virtual_account: "9032 4410 97", due: 18000, paid: 12000, status: "partial" },
    ];

    for (const v of vendorsList) {
      await client.query(
        `INSERT INTO vendors (id, org_id, name, shop, phone, section, virtual_account, due, paid, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [v.id, v.org_id, v.name, v.shop, v.phone, v.section, v.virtual_account, v.due, v.paid, v.status]
      );
    }

    console.log("Seeding dues categories...");
    const duesCategories = [
      { id: "CAT-01", org_id: "ORG-001", name: "Monthly Market Levy", amount: 18000, frequency: "Monthly", active: true, vendors_count: 10 },
      { id: "CAT-02", org_id: "ORG-001", name: "Sanitation Fee", amount: 5000, frequency: "Monthly", active: true, vendors_count: 10 },
      { id: "CAT-03", org_id: "ORG-001", name: "Security Fee", amount: 4000, frequency: "Monthly", active: true, vendors_count: 10 },
      { id: "CAT-04", org_id: "ORG-001", name: "Shop Rent", amount: 60000, frequency: "Yearly", active: true, vendors_count: 10 },
      { id: "CAT-05", org_id: "ORG-001", name: "Local Government Tax", amount: 2500, frequency: "Monthly", active: false, vendors_count: 3 },
      { id: "CAT-06", org_id: "ORG-001", name: "Annual Convention Levy", amount: 3000, frequency: "One-time", active: true, vendors_count: 10 },
    ];

    for (const d of duesCategories) {
      await client.query(
        `INSERT INTO dues_categories (id, org_id, name, amount, frequency, active, vendors_count) 
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [d.id, d.org_id, d.name, d.amount, d.frequency, d.active, d.vendors_count]
      );
    }

    console.log("Seeding payments...");
    const payments = [
      { id: "TXN-90211", org_id: "ORG-001", vendor_id: "V-1042", vendor_name: "Chinedu Okafor", account: "9032 4410 88", amount: 18000, category: "Monthly Levy", date: "Today, 10:42", status: "Matched" },
      { id: "TXN-90210", org_id: "ORG-001", vendor_id: "V-1045", vendor_name: "Funmi Adeyemi", account: "9032 4410 91", amount: 22000, category: "Monthly Levy", date: "Today, 09:31", status: "Overpaid" },
      { id: "TXN-90209", org_id: "ORG-001", vendor_id: "V-1043", vendor_name: "Aisha Bello", account: "9032 4410 89", amount: 10000, category: "Monthly Levy", date: "Yesterday", status: "Partial" },
      { id: "TXN-90208", org_id: "ORG-001", vendor_id: "V-1050", vendor_name: "Olu Adebayo", account: "9032 4410 96", amount: 24000, category: "Monthly Levy", date: "Yesterday", status: "Matched" },
      { id: "TXN-90207", org_id: "ORG-001", vendor_id: "V-1049", vendor_name: "Halima Yusuf", account: "9032 4410 95", amount: 18000, category: "Monthly Levy", date: "2 days ago", status: "Matched" },
    ];

    for (const p of payments) {
      await client.query(
        `INSERT INTO payments (id, org_id, vendor_id, vendor_name, account, amount, category, date, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [p.id, p.org_id, p.vendor_id, p.vendor_name, p.account, p.amount, p.category, p.date, p.status]
      );
    }

    console.log("Seeding reconciliations...");
    const reconciliations = [
      { id: "RC-771", org_id: "ORG-001", source: "9032 4410 88", vendor_name: "Chinedu Okafor", expected: 18000, paid: 18000, diff: 0, status: "matched" },
      { id: "RC-772", org_id: "ORG-001", source: "9032 4410 91", vendor_name: "Funmi Adeyemi", expected: 18000, paid: 22000, diff: 4000, status: "overpaid" },
      { id: "RC-773", org_id: "ORG-001", source: "9032 4410 89", vendor_name: "Aisha Bello", expected: 18000, paid: 10000, diff: -8000, status: "underpaid" },
      { id: "RC-774", org_id: "ORG-001", source: "9032 4410 22", vendor_name: "Unmatched", expected: 0, paid: 9500, diff: 9500, status: "review" },
      { id: "RC-775", org_id: "ORG-001", source: "9032 4410 96", vendor_name: "Olu Adebayo", expected: 24000, paid: 24000, diff: 0, status: "matched" },
    ];

    for (const r of reconciliations) {
      await client.query(
        `INSERT INTO reconciliations (id, org_id, source, vendor_name, expected, paid, diff, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [r.id, r.org_id, r.source, r.vendor_name, r.expected, r.paid, r.diff, r.status]
      );
    }

    console.log("Seeding receipts...");
    const receiptsList = [
      { id: "RCP-20451", org_id: "ORG-001", vendor_name: "Chinedu Okafor", category: "Monthly Levy", amount: 18000, date: "12 Jun 2026", status: "Issued" },
      { id: "RCP-20450", org_id: "ORG-001", vendor_name: "Olu Adebayo", category: "Monthly Levy", amount: 24000, date: "12 Jun 2026", status: "Issued" },
      { id: "RCP-20449", org_id: "ORG-001", vendor_name: "Halima Yusuf", category: "Monthly Levy", amount: 18000, date: "11 Jun 2026", status: "Issued" },
      { id: "RCP-20448", org_id: "ORG-001", vendor_name: "Ngozi Eze", category: "Sanitation Fee", amount: 5000, date: "11 Jun 2026", status: "Issued" },
      { id: "RCP-20447", org_id: "ORG-001", vendor_name: "Ibrahim Musa", category: "Shop Rent", amount: 60000, date: "10 Jun 2026", status: "Issued" },
      { id: "RCP-20446", org_id: "ORG-001", vendor_name: "Kemi Lawal", category: "Monthly Levy", amount: 12000, date: "10 Jun 2026", status: "Partial" },
    ];

    for (const r of receiptsList) {
      await client.query(
        `INSERT INTO receipts (id, org_id, vendor_name, category, amount, date, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [r.id, r.org_id, r.vendor_name, r.category, r.amount, r.date, r.status]
      );
    }

    console.log("Seeding notifications...");
    const notificationsSeed = [
      // Super Admin alerts
      { id: "NT-001", org_id: null, vendor_id: null, role: "super-admin", title: "Platform Launch Successful", message: "Welcome to Duesly Super-Admin Portal. Setup is fully complete.", read: false },
      { id: "NT-002", org_id: "ORG-001", vendor_id: null, role: "super-admin", title: "Organization Onboarded", message: "Ariaria Market Association has been successfully configured.", read: false },
      { id: "NT-003", org_id: null, vendor_id: null, role: "super-admin", title: "Performance Milestone", message: "Weekly transaction volume has exceeded ₦12.4M across all organizations.", read: true },

      // Org Admin alerts
      { id: "NT-004", org_id: "ORG-001", vendor_id: null, role: "admin", title: "Nomba Auto-Reconciliation", message: "Nomba successfully auto-matched 12 bank transfers this morning.", read: false },
      { id: "NT-005", org_id: "ORG-001", vendor_id: null, role: "admin", title: "Dues Bill Generated", message: "Standard Sanitation Levy generated for all active vendors.", read: false },
      { id: "NT-006", org_id: "ORG-001", vendor_id: null, role: "admin", title: "Compliance Warning", message: "3 vendors have levies overdue by more than 30 days.", read: true },

      // Vendor alerts (Aisha Bello: V-1043)
      { id: "NT-007", org_id: "ORG-001", vendor_id: "V-1043", role: "vendor", title: "Portal Secured", message: "Your member portal credentials have been configured successfully.", read: false },
      { id: "NT-008", org_id: "ORG-001", vendor_id: "V-1043", role: "vendor", title: "Dedicated Account Assigned", message: "Wema Bank dedicated payment account assigned for standard levy deposits.", read: false },
    ];

    for (const n of notificationsSeed) {
      await client.query(
        `INSERT INTO notifications (id, org_id, vendor_id, role, title, message, read) 
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [n.id, n.org_id, n.vendor_id, n.role, n.title, n.message, n.read]
      );
    }

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Database seed failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

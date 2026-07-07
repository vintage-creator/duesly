import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

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
} catch (error) {
  console.error("Could not load .env file", error);
}

const databaseUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/duesly";
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1")
    ? { rejectUnauthorized: false }
    : false,
});

const associations = [
  { id: "ORG-001", name: "Ariaria Market Association", type: "Market", status: "active", phone: "+234 803 412 9087", address: "Aba, Abia State", wallet: "9032 4400 01" },
  { id: "ORG-002", name: "Lekki Phase 1 Estate", type: "Estate", status: "active", phone: "+234 809 111 2222", address: "Lekki, Lagos State", wallet: "9032 4400 02" },
  { id: "ORG-003", name: "Onitsha Main Market Union", type: "Market", status: "active", phone: "+234 806 333 4444", address: "Onitsha, Anambra State", wallet: "9032 4400 03" },
  { id: "ORG-004", name: "Trans-Amadi Cooperative", type: "Cooperative", status: "active", phone: "+234 805 555 6666", address: "Port Harcourt, Rivers State", wallet: "9032 4400 04" },
  { id: "ORG-005", name: "Kano Leather Traders", type: "Trade Group", status: "pending", phone: "+234 802 777 8888", address: "Kano, Kano State", wallet: "9032 4400 05" },
  { id: "ORG-006", name: "Magodo Residents Forum", type: "Estate", status: "active", phone: "+234 803 999 0000", address: "Magodo, Lagos State", wallet: "9032 4400 06" },
  { id: "ORG-008", name: "Alaba International Market", type: "Market", status: "active", phone: "+234 807 456 1122", address: "Ojo, Lagos State", wallet: "9032 4400 08" },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const association of associations) {
      await client.query(
        `INSERT INTO organizations (id, name, type, status, phone, address, wallet_account)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           status = EXCLUDED.status,
           phone = EXCLUDED.phone,
           address = EXCLUDED.address,
           wallet_account = EXCLUDED.wallet_account`,
        [
          association.id,
          association.name,
          association.type,
          association.status,
          association.phone,
          association.address,
          association.wallet,
        ]
      );
    }
    await client.query("COMMIT");
    console.log(`Upserted ${associations.length} homepage associations.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to upsert homepage associations:", error);
  process.exit(1);
});

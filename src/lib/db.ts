import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/duesly";

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("vercel-storage.com") || databaseUrl.includes("supabase.co") || databaseUrl.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : false,
});

export async function query<T = any>(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log("Executed query", { text, duration, rows: res.rowCount });
  return res;
}

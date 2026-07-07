let activePool: any = null;

async function getPool() {
  if (typeof window !== "undefined") {
    // Return a dummy pool in browser context to avoid crashes
    return {
      query: async () => ({ rows: [], rowCount: 0 }),
      connect: async () => ({
        query: async () => ({ rows: [], rowCount: 0 }),
        release: () => {},
      }),
    };
  }

  if (activePool) return activePool;
  
  // Server-only dynamic import of pg
  const pg = await import("pg");
  const { Pool } = pg.default || pg;
  
  const databaseUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/duesly";
  activePool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("vercel-storage.com") || databaseUrl.includes("supabase.co") || databaseUrl.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false,
  });
  return activePool;
}

// Export a wrapper that conforms to pg.Pool interface
export const pool = {
  async query(text: string, params?: any[]) {
    const realPool = await getPool();
    return realPool.query(text, params);
  },
  async connect() {
    const realPool = await getPool();
    return realPool.connect();
  }
};

export async function query<T = any>(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log("Executed query", { text, duration, rows: res.rowCount });
  return res;
}

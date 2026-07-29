import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  console.log("🔍 Testing PostgreSQL database & schema setup...");
  const client = await pool.connect();
  try {
    const timeRes = await client.query("SELECT NOW() as current_time, current_database(), current_user");
    console.log("✅ Database connection successful!");
    console.log("   • Server Time:", timeRes.rows[0].current_time);
    console.log("   • Database Name:", timeRes.rows[0].current_database);
    console.log("   • Database User:", timeRes.rows[0].current_user);

    // Query better_auth schema tables
    const schemaTablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'better_auth'
    `);
    const schemaTables = schemaTablesRes.rows.map((r) => r.table_name);
    console.log("✅ Tables in 'better_auth' schema:", schemaTables.join(", ") || "None");

    // Query public schema for better auth tables (should be empty)
    const publicTablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user', 'session', 'account', 'verification')
    `);
    const publicTables = publicTablesRes.rows.map((r) => r.table_name);
    console.log("ℹ️ Better Auth tables in 'public' schema (should be empty):", publicTables.join(", ") || "Clean (0 tables)");
  } catch (error: any) {
    console.error("❌ Database test failed:", error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection();

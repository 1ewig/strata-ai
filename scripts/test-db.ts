/**
 * Healthcheck script that verifies the PostgreSQL connection and inspects the
 * Better Auth schema layout (tables in `better_auth` vs leftover tables in `public`).
 *
 * Requires the `DATABASE_URL` environment variable (the Supabase Postgres connection string).
 * Run with: `bun run db:test`.
 */
import { Pool } from "pg";

// Read the Postgres connection string from the environment.
const connectionString = process.env.DATABASE_URL;

// Fail fast with a clear message if the required env var is missing.
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

// Create a connection pool with SSL (Supabase) and a 5s timeout so the check fails fast.
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 5000,
});

/**
 * Runs the database healthcheck: verifies the connection, lists `better_auth`
 * schema tables, and confirms no Better Auth tables remain in the `public` schema.
 *
 * @returns Promise that resolves when the check completes (or exits the process on failure).
 */
async function testConnection() {
  console.log("🔍 Testing PostgreSQL database & schema setup...");
  // Check out a single client for all healthcheck queries.
  const client = await pool.connect();
  try {
    // Run a trivial query to confirm the connection and surface server details.
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

/**
 * Starts the healthcheck. The process exits once the check completes (success or failure).
 */
testConnection();

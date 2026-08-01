/**
 * Migrates the Better Auth tables out of the `public` schema into the isolated
 * `better_auth` schema on the Supabase Postgres database.
 *
 * Requires the `DATABASE_URL` environment variable (the Supabase Postgres connection string).
 * Run with: `bun run db:migrate`.
 */
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// Read the Postgres connection string from the environment.
const connectionString = process.env.DATABASE_URL;

// Fail fast with a clear message if the required env var is missing.
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

// Build a connection pool; SSL is required by Supabase, and self-signed certs are accepted.
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Reads the migration SQL file and executes it against the database.
 *
 * @returns Promise that resolves when the migration finishes (or exits the process on failure).
 */
async function runMigration() {
  console.log("⚡ Executing Better Auth Schema Isolation Migration...");
  // Resolve and read the migration SQL file shipped alongside this script.
  const sqlPath = path.join(__dirname, "better-auth-schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  // Check out a single client so the whole migration runs on one connection.
  const client = await pool.connect();
  try {
    // Execute the full migration script (drops public tables, creates `better_auth` schema).
    await client.query(sql);
    console.log("✅ Successfully dropped public tables and created tables in 'better_auth' schema!");
  } catch (err: any) {
    console.error("❌ Schema migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Starts the migration. The process exits once the migration finishes (success or failure).
 */
runMigration();

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c search_path=better_auth,public",
});

export interface RateLimitResult {
  allowed: boolean;
  remaining5h: number;
  remainingWeek: number;
  retryAfter?: number;
}

const FIVE_HOURS_MS = 5 * 3600 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;
const MAX_5H = 10;
const MAX_WEEK = 50;

export async function checkAndIncrementRateLimit(userId: string): Promise<RateLimitResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM better_auth.message_log
       WHERE user_id = $1 AND created_at < NOW() - INTERVAL '7 days'`,
      [userId],
    );

    const fiveHourResult = await client.query(
      `SELECT COUNT(*) AS cnt FROM better_auth.message_log
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '5 hours'`,
      [userId],
    );
    const fiveHourCount = parseInt(fiveHourResult.rows[0].cnt, 10);

    if (fiveHourCount >= MAX_5H) {
      const oldest = await client.query(
        `SELECT created_at FROM better_auth.message_log
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '5 hours'
         ORDER BY created_at ASC LIMIT 1`,
        [userId],
      );
      const retryAfter = Math.ceil(
        (new Date(oldest.rows[0].created_at).getTime() + FIVE_HOURS_MS - Date.now()) / 1000,
      );
      await client.query("COMMIT");
      return { allowed: false, remaining5h: 0, remainingWeek: MAX_WEEK - fiveHourCount, retryAfter };
    }

    const weekResult = await client.query(
      `SELECT COUNT(*) AS cnt FROM better_auth.message_log
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
      [userId],
    );
    const weekCount = parseInt(weekResult.rows[0].cnt, 10);

    if (weekCount >= MAX_WEEK) {
      const oldest = await client.query(
        `SELECT created_at FROM better_auth.message_log
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
         ORDER BY created_at ASC LIMIT 1`,
        [userId],
      );
      const retryAfter = Math.ceil(
        (new Date(oldest.rows[0].created_at).getTime() + SEVEN_DAYS_MS - Date.now()) / 1000,
      );
      await client.query("COMMIT");
      return { allowed: false, remaining5h: MAX_5H - fiveHourCount, remainingWeek: 0, retryAfter };
    }

    await client.query(
      `INSERT INTO better_auth.message_log (user_id) VALUES ($1)`,
      [userId],
    );

    await client.query("COMMIT");
    return { allowed: true, remaining5h: MAX_5H - fiveHourCount - 1, remainingWeek: MAX_WEEK - weekCount - 1 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

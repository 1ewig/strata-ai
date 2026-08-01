import { Pool } from "pg";

// Shared Postgres pool routed to the better_auth schema, where message_log lives
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c search_path=better_auth,public",
});

/**
 * Outcome of a rate-limit check for a single user.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining5h: number;
  remainingWeek: number;
  retryAfter?: number;
}

// Rolling windows and per-window caps for the two rate limits
const FIVE_HOURS_MS = 5 * 3600 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;
const MAX_5H = 10;
const MAX_WEEK = 50;

/**
 * Atomically checks both rate-limit windows for a user and records the
 * message when allowed, all within a single transaction.
 * @param userId - The user's unique identifier.
 * @returns The current rate-limit state; `retryAfter` (seconds) is set when
 * a window is exhausted.
 */
export async function checkAndIncrementRateLimit(userId: string): Promise<RateLimitResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Purge log entries older than the retention window so counts stay accurate
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
      // 5-hour window exhausted; report seconds until the oldest entry expires
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
      // Weekly window exhausted; report seconds until the oldest entry expires
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

    // Both windows have room: record the message, then report the remaining budget
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

/**
 * Read-only snapshot of a user's rate-limit state; never records a message.
 * @param userId - The user's unique identifier.
 * @returns The current rate-limit state; `retryAfter` is set only when a
 * window is exhausted.
 */
export async function getRateLimitStatus(userId: string): Promise<RateLimitResult> {
  const client = await pool.connect();
  try {
    const fiveHourResult = await client.query(
      `SELECT COUNT(*) AS cnt FROM better_auth.message_log
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '5 hours'`,
      [userId],
    );
    const fiveHourCount = parseInt(fiveHourResult.rows[0].cnt, 10);

    const weekResult = await client.query(
      `SELECT COUNT(*) AS cnt FROM better_auth.message_log
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
      [userId],
    );
    const weekCount = parseInt(weekResult.rows[0].cnt, 10);

    let retryAfter: number | undefined;
    if (fiveHourCount >= MAX_5H) {
      const oldest = await client.query(
        `SELECT created_at FROM better_auth.message_log
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '5 hours'
         ORDER BY created_at ASC LIMIT 1`,
        [userId],
      );
      if (oldest.rows.length > 0) {
        // Seconds until the oldest entry leaves the 5-hour window
        retryAfter = Math.max(
          1,
          Math.ceil(
            (new Date(oldest.rows[0].created_at).getTime() + FIVE_HOURS_MS - Date.now()) / 1000,
          ),
        );
      }
    } else if (weekCount >= MAX_WEEK) {
      const oldest = await client.query(
        `SELECT created_at FROM better_auth.message_log
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
         ORDER BY created_at ASC LIMIT 1`,
        [userId],
      );
      if (oldest.rows.length > 0) {
        // Seconds until the oldest entry leaves the 7-day window
        retryAfter = Math.max(
          1,
          Math.ceil(
            (new Date(oldest.rows[0].created_at).getTime() + SEVEN_DAYS_MS - Date.now()) / 1000,
          ),
        );
      }
    }

    return {
      allowed: fiveHourCount < MAX_5H && weekCount < MAX_WEEK,
      remaining5h: Math.max(0, MAX_5H - fiveHourCount),
      remainingWeek: Math.max(0, MAX_WEEK - weekCount),
      retryAfter,
    };
  } finally {
    client.release();
  }
}


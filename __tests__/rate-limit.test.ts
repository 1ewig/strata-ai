import { afterEach, describe, it, expect, mock } from "bun:test";

/**
 * Rate-limit logic tests. The `pg` module is mocked with a scriptable fake
 * pool/client so the SQL orchestration (windows, retryAfter math, transaction
 * lifecycle) runs without a database.
 */

const FIVE_HOURS_MS = 5 * 3600 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

const client = {
  query: mock(),
  release: mock(),
};

class FakePool {
  async connect() {
    return client;
  }
}

mock.module("pg", () => ({
  Pool: FakePool,
  default: { Pool: FakePool },
}));

const { checkAndIncrementRateLimit, getRateLimitStatus } = await import("@/lib/rate-limit");

function countRows(value: number) {
  return { rows: [{ cnt: String(value) }] };
}

function oldestRow(createdAt: string) {
  return { rows: [{ created_at: createdAt }] };
}

const OK = { rows: [] };

/**
 * Programs the fake client with a handler that routes each SQL statement to a
 * scripted response based on its shape.
 */
function programQueries(opts: {
  fiveHourCount?: number;
  weekCount?: number;
  oldest5h?: string;
  oldestWeek?: string;
  failInsert?: boolean;
}) {
  const { fiveHourCount = 0, weekCount = 0, oldest5h, oldestWeek, failInsert = false } = opts;
  client.query.mockImplementation((sql: string) => {
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return OK;
    if (sql.startsWith("DELETE FROM")) return OK;
    if (sql.includes("COUNT(*)") && sql.includes("5 hours")) return countRows(fiveHourCount);
    if (sql.includes("COUNT(*)") && sql.includes("7 days")) return countRows(weekCount);
    if (sql.includes("ORDER BY created_at ASC") && sql.includes("5 hours")) {
      return oldest5h ? oldestRow(oldest5h) : OK;
    }
    if (sql.includes("ORDER BY created_at ASC") && sql.includes("7 days")) {
      return oldestWeek ? oldestRow(oldestWeek) : OK;
    }
    if (sql.startsWith("INSERT INTO")) {
      if (failInsert) throw new Error("insert failed");
      return OK;
    }
    throw new Error(`unexpected query: ${sql}`);
  });
}

afterEach(() => {
  client.query.mockClear();
  client.release.mockClear();
});

describe("checkAndIncrementRateLimit", () => {
  it("records a message and reports remaining budget when both windows have room", async () => {
    programQueries({ fiveHourCount: 4, weekCount: 30 });

    const result = await checkAndIncrementRateLimit("user-1");
    expect(result).toEqual({ allowed: true, remaining5h: 5, remainingWeek: 19 });

    const inserts = client.query.mock.calls.filter(([sql]) => String(sql).startsWith("INSERT INTO"));
    expect(inserts).toHaveLength(1);
    expect(client.query.mock.calls.some(([sql]) => sql === "COMMIT")).toBe(true);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("returns a 5-hour denial with a retryAfter hint when that window is exhausted", async () => {
    const oldest = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    programQueries({ fiveHourCount: 10, weekCount: 40, oldest5h: oldest });

    const result = await checkAndIncrementRateLimit("user-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining5h).toBe(0);
    // Source reports MAX_WEEK - fiveHourCount for the week window on 5h denial.
    expect(result.remainingWeek).toBe(40);

    const expected = Math.ceil((new Date(oldest).getTime() + FIVE_HOURS_MS - Date.now()) / 1000);
    expect(Math.abs(result.retryAfter! - expected)).toBeLessThanOrEqual(2);

    const inserts = client.query.mock.calls.filter(([sql]) => String(sql).startsWith("INSERT INTO"));
    expect(inserts).toHaveLength(0);
  });

  it("returns a weekly denial when only the week window is exhausted", async () => {
    const oldest = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    programQueries({ fiveHourCount: 5, weekCount: 50, oldestWeek: oldest });

    const result = await checkAndIncrementRateLimit("user-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining5h).toBe(5);
    expect(result.remainingWeek).toBe(0);

    const expected = Math.ceil((new Date(oldest).getTime() + SEVEN_DAYS_MS - Date.now()) / 1000);
    expect(Math.abs(result.retryAfter! - expected)).toBeLessThanOrEqual(2);
  });

  it("rolls back and rethrows when the insert fails", async () => {
    programQueries({ fiveHourCount: 2, weekCount: 5, failInsert: true });

    await expect(checkAndIncrementRateLimit("user-1")).rejects.toThrow("insert failed");
    expect(client.query.mock.calls.some(([sql]) => sql === "ROLLBACK")).toBe(true);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});

describe("getRateLimitStatus", () => {
  it("reports an allowed snapshot with remaining budget", async () => {
    programQueries({ fiveHourCount: 3, weekCount: 20 });

    const result = await getRateLimitStatus("user-1");
    expect(result).toEqual({ allowed: true, remaining5h: 7, remainingWeek: 30, retryAfter: undefined });
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("reports a 5-hour denial with a retryAfter hint", async () => {
    const oldest = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    programQueries({ fiveHourCount: 10, weekCount: 40, oldest5h: oldest });

    const result = await getRateLimitStatus("user-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining5h).toBe(0);

    const expected = Math.ceil((new Date(oldest).getTime() + FIVE_HOURS_MS - Date.now()) / 1000);
    expect(Math.abs(result.retryAfter! - expected)).toBeLessThanOrEqual(2);
  });

  it("reports a weekly denial when only the week window is exhausted", async () => {
    const oldest = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    programQueries({ fiveHourCount: 5, weekCount: 50, oldestWeek: oldest });

    const result = await getRateLimitStatus("user-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining5h).toBe(5);
    expect(result.remainingWeek).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("guards the retryAfter at a minimum of 1 second", async () => {
    // An oldest entry more than 5h old (an edge that should not occur in
    // practice) yields a negative retryAfter that the guard clamps to 1.
    const stale = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    programQueries({ fiveHourCount: 10, oldest5h: stale });

    const result = await getRateLimitStatus("user-1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(1);
  });

  it("omits retryAfter when no oldest entry exists", async () => {
    programQueries({ fiveHourCount: 10, weekCount: 10 });

    const result = await getRateLimitStatus("user-1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeUndefined();
  });
});
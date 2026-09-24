import { Pool } from "pg";
import { checkAndIncrementRateLimit, refundRateLimit } from "../src/lib/rate-limit";
import { runAgentResponse } from "../src/lib/ai/agent-runner";
import { createMutableWorkspace } from "../src/lib/ai/workspace";
import { DEFAULT_AGENT_MODEL } from "../src/lib/ai/providers";

console.log("===============================================================");
console.log("   Strata AI — API Route & Pipeline Latency Profiler          ");
console.log("===============================================================\n");

const dbUrl = process.env.DATABASE_URL;
const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!googleKey) {
  console.error("❌ GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  options: "-c search_path=better_auth,public",
});

async function profileDatabase() {
  console.log("1. Profiling Database Latency (Supabase PostgreSQL)...");

  // Test raw ping
  const pingStart = performance.now();
  const client = await pool.connect();
  const connectMs = performance.now() - pingStart;

  const queryStart = performance.now();
  await client.query("SELECT 1");
  const queryMs = performance.now() - queryStart;

  // Fetch an existing user id or create a temporary one
  const userRes = await client.query("SELECT id FROM better_auth.user LIMIT 1");
  let testUserId = userRes.rows[0]?.id;
  let isTempUser = false;

  if (!testUserId) {
    testUserId = "temp-bench-user-" + Date.now();
    await client.query(
      `INSERT INTO better_auth.user (id, name, email, "emailVerified", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, false, NOW(), NOW())`,
      [testUserId, "Benchmark User", `${testUserId}@example.com`]
    );
    isTempUser = true;
  }
  client.release();

  console.log(`   • DB Pool Connect Latency: ${Math.round(connectMs)} ms`);
  console.log(`   • DB Round-trip (SELECT 1): ${Math.round(queryMs)} ms`);
  console.log(`   • Testing with User ID: ${testUserId}`);

  // Test Rate Limit Transaction (Purge + 2 Counts + Insert)
  const rlStart = performance.now();
  const rlResult = await checkAndIncrementRateLimit(testUserId);
  const rlMs = performance.now() - rlStart;
  console.log(`   • Rate Limit Atomic Transaction: ${Math.round(rlMs)} ms (Allowed: ${rlResult.allowed})`);

  // Cleanup
  if (rlResult.messageLogId) {
    const refundStart = performance.now();
    await refundRateLimit(rlResult.messageLogId);
    const refundMs = performance.now() - refundStart;
    console.log(`   • Rate Limit Refund/Cleanup: ${Math.round(refundMs)} ms`);
  }

  if (isTempUser) {
    const clientClean = await pool.connect();
    await clientClean.query("DELETE FROM better_auth.user WHERE id = $1", [testUserId]);
    clientClean.release();
  }
  console.log();

  return { connectMs, queryMs, rlMs };
}

async function profileAgentRunnerStream() {
  console.log("2. Profiling Agent Runner & SSE Response Pipeline...");

  const testMessage = [
    {
      id: "msg-1",
      role: "user" as const,
      content: "Explain memoization in one short sentence.",
      parts: [
        {
          type: "text" as const,
          text: "Explain memoization in one short sentence.",
        },
      ],
    },
  ];

  const runnerStart = performance.now();
  const res = await runAgentResponse({
    workspace: createMutableWorkspace([]),
    messages: testMessage as any,
    modelId: DEFAULT_AGENT_MODEL,
    thinkingLevel: "minimal",
    maxSteps: 5,
    remaining5h: 10,
    remainingWeek: 50,
  });

  const responseHeadersMs = performance.now() - runnerStart;
  console.log(`   • Response object created in: ${Math.round(responseHeadersMs)} ms`);
  console.log(`   • Content-Type: ${res.headers.get("Content-Type")}`);
  console.log(`   • Transfer-Encoding: ${res.headers.get("Transfer-Encoding") || "chunked/none"}`);

  if (!res.body) {
    console.error("❌ Response body is null.");
    return;
  }

  const reader = res.body.getReader();
  let firstChunkTime: number | null = null;
  let chunkCount = 0;
  let totalBytes = 0;
  const chunkTimestamps: number[] = [];

  const streamReadStart = performance.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const now = performance.now();
    if (firstChunkTime === null && value.length > 0) {
      firstChunkTime = now;
    }
    chunkCount++;
    totalBytes += value.length;
    chunkTimestamps.push(Math.round(now - runnerStart));
  }

  const totalStreamMs = performance.now() - runnerStart;
  const ttftFromStart = firstChunkTime !== null ? Math.round(firstChunkTime - runnerStart) : 0;
  const _ttftFromStreamStart = firstChunkTime !== null ? Math.round(firstChunkTime - streamReadStart) : 0;

  console.log(`   • Time to First SSE Chunk (TTFT): ${ttftFromStart} ms (from dispatch)`);
  console.log(`   • Total Stream Duration: ${Math.round(totalStreamMs)} ms`);
  console.log(`   • Total SSE Chunks Received: ${chunkCount} chunks (${totalBytes} bytes)`);

  if (chunkTimestamps.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < chunkTimestamps.length; i++) {
      intervals.push(chunkTimestamps[i] - chunkTimestamps[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    console.log(`   • Avg Interval Between Chunks: ${Math.round(avgInterval * 10) / 10} ms (smoothStream pacing)`);
  }

  console.log();
  return { responseHeadersMs, ttftFromStart, totalStreamMs, chunkCount };
}

async function main() {
  try {
    const dbMetrics = await profileDatabase();
    const runnerMetrics = await profileAgentRunnerStream();

    console.log("==================== LATENCY BUDGET BREAKDOWN ====================");
    if (dbMetrics && runnerMetrics) {
      const dbOverhead = dbMetrics.rlMs;
      const modelTTFT = runnerMetrics.ttftFromStart;
      const fullTurnTTFT = dbOverhead + modelTTFT;

      console.table({
        "Database Rate-Limit Check": {
          Duration: `${Math.round(dbOverhead)} ms`,
          "Share of TTFT": `${Math.round((dbOverhead / fullTurnTTFT) * 100)}%`,
          Notes: "Postgres transaction in withAgentRouteGuards",
        },
        "Model Processing & TTFT": {
          Duration: `${Math.round(modelTTFT)} ms`,
          "Share of TTFT": `${Math.round((modelTTFT / fullTurnTTFT) * 100)}%`,
          Notes: "Gemini 3.5 Flash Lite + SDK stream creation",
        },
        "Total Estimated Time-to-First-Token (E2E)": {
          Duration: `${Math.round(fullTurnTTFT)} ms`,
          "Share of TTFT": "100%",
          Notes: "Total wait time before frontend receives first token",
        },
        "Full Stream Completion": {
          Duration: `${Math.round(dbOverhead + runnerMetrics.totalStreamMs)} ms`,
          "Share of TTFT": "N/A",
          Notes: "Full generation + smoothStream word pacing (25ms)",
        },
      });
    }
    console.log("==================================================================\n");
  } catch (err) {
    console.error("Profile error:", err);
  } finally {
    await pool.end();
  }
}

await main();

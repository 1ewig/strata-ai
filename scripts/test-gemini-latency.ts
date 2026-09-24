import { streamText } from "ai";
import { resolveAgentModel } from "../src/lib/ai/providers";
import { MODELS, MODEL_THINKING_LEVELS, ThinkingLevelId } from "../src/lib/models";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  console.error("Error: GOOGLE_GENERATIVE_AI_API_KEY is not set in your environment.");
  console.error("Please add it to .env.local or export it before running this script.");
  process.exit(1);
}

interface BenchmarkResult {
  modelId: string;
  thinkingLevel: string;
  ttftMs: number;
  totalMs: number;
  promptTokens?: number;
  outputTokens?: number;
  tokensPerSec?: number;
  status: "SUCCESS" | "FAILED";
  error?: string;
}

const TEST_PROMPTS = {
  quick: "Explain the concept of memoization in two concise sentences.",
  code: "Write a TypeScript function that implements binary search on a sorted number array, with full JSDoc.",
  reasoning: "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Explain step by step.",
};

async function benchmarkModel(
  modelId: string,
  thinkingLevel: string = "minimal",
  promptText: string = TEST_PROMPTS.quick,
): Promise<BenchmarkResult> {
  const startTime = performance.now();
  let firstChunkTime: number | null = null;
  let textLength = 0;

  try {
    const { model, reasoning, providerOptions } = resolveAgentModel(modelId, thinkingLevel);

    const stream = streamText({
      model,
      prompt: promptText,
      ...(reasoning ? { reasoning: reasoning as Parameters<typeof streamText>[0]["reasoning"] } : {}),
      ...(providerOptions ? { providerOptions } : {}),
    });

    for await (const chunk of stream.textStream) {
      if (firstChunkTime === null && chunk.length > 0) {
        firstChunkTime = performance.now();
      }
      textLength += chunk.length;
    }

    const totalTime = performance.now() - startTime;
    const ttft = firstChunkTime !== null ? firstChunkTime - startTime : totalTime;
    const usage = await stream.usage;

    const outTokens = usage?.outputTokens ?? Math.round(textLength / 4);
    const inTokens = usage?.inputTokens;
    const tps = totalTime > 0 ? (outTokens / (totalTime / 1000)) : 0;

    return {
      modelId,
      thinkingLevel,
      ttftMs: Math.round(ttft),
      totalMs: Math.round(totalTime),
      promptTokens: inTokens,
      outputTokens: outTokens,
      tokensPerSec: Math.round(tps * 10) / 10,
      status: "SUCCESS",
    };
  } catch (err: unknown) {
    const totalTime = performance.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      modelId,
      thinkingLevel,
      ttftMs: 0,
      totalMs: Math.round(totalTime),
      status: "FAILED",
      error: errorMessage,
    };
  }
}

async function main() {
  console.log("==================================================");
  console.log("   Strata AI — Gemini Latency & TTFT Benchmark   ");
  console.log("==================================================\n");

  const geminiModels = MODELS.filter((m) => !m.provider || m.provider === "google");

  // Parse custom args if provided
  const args = process.argv.slice(2);
  const targetModelArg = args.find((a) => a.startsWith("--model="))?.split("=")[1];
  const targetPromptType = args.find((a) => a.startsWith("--prompt="))?.split("=")[1] as keyof typeof TEST_PROMPTS | undefined;

  const testPrompt = targetPromptType && TEST_PROMPTS[targetPromptType] ? TEST_PROMPTS[targetPromptType] : TEST_PROMPTS.quick;

  const modelsToTest = targetModelArg
    ? geminiModels.filter((m) => m.id === targetModelArg)
    : geminiModels;

  if (modelsToTest.length === 0) {
    console.error(`No matching Gemini model found for argument: ${targetModelArg}`);
    console.log("Available Gemini models:");
    geminiModels.forEach((m) => console.log(` - ${m.id} (${m.label})`));
    process.exit(1);
  }

  console.log(`Prompt: "${testPrompt.slice(0, 70)}..."\n`);
  console.log("Running benchmarks (measuring TTFT and tokens/sec)...");

  const results: BenchmarkResult[] = [];

  for (const model of modelsToTest) {
    const thinkingConfig = MODEL_THINKING_LEVELS[model.id];
    const testCases: (ThinkingLevelId | "none")[] = thinkingConfig
      ? ["minimal", "high"].filter((l) => thinkingConfig.levels.includes(l as ThinkingLevelId)) as ThinkingLevelId[]
      : ["none"];

    for (const level of testCases) {
      const levelParam = level === "none" ? undefined : level;
      process.stdout.write(`Benchmarking ${model.id} [thinking: ${level}]... `);
      const res = await benchmarkModel(model.id, levelParam, testPrompt);
      if (res.status === "SUCCESS") {
        console.log(`✓ TTFT: ${res.ttftMs}ms | Total: ${res.totalMs}ms | Speed: ${res.tokensPerSec} tps`);
      } else {
        console.log(`✗ Error: ${res.error}`);
      }
      results.push(res);
    }
  }

  console.log("\n==================== SUMMARY RESULTS ====================");
  console.table(
    results.map((r) => ({
      Model: r.modelId,
      Thinking: r.thinkingLevel,
      Status: r.status,
      "TTFT (ms)": r.status === "SUCCESS" ? `${r.ttftMs} ms` : "N/A",
      "Total (ms)": `${r.totalMs} ms`,
      "In Tokens": r.promptTokens ?? "N/A",
      "Out Tokens": r.outputTokens ?? "N/A",
      "Speed (t/s)": r.tokensPerSec ? `${r.tokensPerSec} t/s` : "N/A",
    }))
  );
  console.log("=========================================================\n");
}

await main();

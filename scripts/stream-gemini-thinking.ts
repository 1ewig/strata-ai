/**
 * Standalone Educational Script: Streaming Gemini Thinking / Reasoning Tokens
 *
 * This script demonstrates the exact method to stream Gemini's internal
 * reasoning / thought tokens in real-time using Vercel AI SDK 7 (`ai` & `@ai-sdk/google`).
 *
 * ============================================================================
 * ARCHITECTURE OVERVIEW: HOW GEMINI STREAMING REASONING WORKS
 * ============================================================================
 *
 * 1. CONFIGURATION:
 *    To enable thoughts, Gemini requires:
 *    - `providerOptions.google.thinkingConfig.includeThoughts: true`
 *    - Optional: `reasoning: 'minimal' | 'low' | 'medium' | 'high'`
 *      (or a numeric `thinkingBudget` in tokens).
 *
 * 2. STREAM CONSUMPTION:
 *    In Vercel AI SDK 7, `streamText()` produces an async iterable `result.fullStream`.
 *    As tokens stream from Google, `fullStream` emits typed chunks in strict order:
 *
 *      ┌──────────────────────────────────────────────────────────┐
 *      │ 1. start / start-step                                    │
 *      │ 2. reasoning-start                                       │
 *      │ 3. reasoning-delta (repeated: chunk.text has thought)    │  <- LIVE REASONING
 *      │ 4. reasoning-end                                         │
 *      │ 5. text-start                                            │
 *      │ 6. text-delta      (repeated: chunk.text has final text) │  <- LIVE ANSWER
 *      │ 7. text-end                                              │
 *      │ 8. finish-step / finish (usage statistics)               │
 *      └──────────────────────────────────────────────────────────┘
 *
 * 3. IN WEB APPLICATIONS (Next.js SSE):
 *    In `src/lib/ai/agent-runner.ts`, `toUIMessageStream({ stream: result.stream })`
 *    automatically translates `reasoning-delta` events into UI message parts
 *    `{ type: 'reasoning', text: '...' }`, which render inside `ThoughtAccordion.tsx`.
 *
 * ============================================================================
 * RUNNING THIS SCRIPT:
 *   bun run scripts/stream-gemini-thinking.ts
 *   bun run scripts/stream-gemini-thinking.ts --model gemini-3.5-flash-lite --level high
 * ============================================================================
 */

import { streamText } from "ai";
import { google } from "@ai-sdk/google";

// Verify API Key
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error("Error: GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  console.error("Please ensure .env.local exists or export the key in your shell.");
  process.exit(1);
}

// Parse simple CLI arguments: --model <id>, --level <low|medium|high>, --prompt <text>
const args = process.argv.slice(2);
function getArg(flag: string, fallback: string): string {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const modelId = getArg("--model", "gemini-3.5-flash-lite");
const thinkingLevel = getArg("--level", "high"); // 'minimal' | 'low' | 'medium' | 'high'
const promptText = getArg(
  "--prompt",
  "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Think step by step and explain why intuitive answers are wrong."
);

// ANSI terminal color codes for rich CLI visualization
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  cyan: "\x1b[36m",
  amber: "\x1b[33m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

async function main() {
  console.log(`\n${ANSI.bold}${ANSI.cyan}=== GEMINI LIVE REASONING & THINKING STREAM ===${ANSI.reset}`);
  console.log(`${ANSI.gray}Model:${ANSI.reset}         ${modelId}`);
  console.log(`${ANSI.gray}Thinking Level:${ANSI.reset} ${thinkingLevel}`);
  console.log(`${ANSI.gray}Prompt:${ANSI.reset}        "${promptText}"\n`);

  const startTime = performance.now();
  let timeToFirstThought: number | null = null;
  let timeToFirstAnswer: number | null = null;
  let thinkingEndTime: number | null = null;

  let totalThoughtChars = 0;
  let totalAnswerChars = 0;

  try {
    /**
     * Step 1: Call `streamText` with the Google Gemini model.
     *
     * Essential parameters for reasoning streaming:
     * - `reasoning`: Level of effort ('minimal' | 'low' | 'medium' | 'high')
     * - `providerOptions.google.thinkingConfig.includeThoughts: true`: Instructs
     *   Google's API to return thoughts in the server-sent response stream.
     */
    const result = streamText({
      model: google(modelId),
      reasoning: thinkingLevel as Parameters<typeof streamText>[0]["reasoning"],
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
          },
        },
      },
      prompt: promptText,
    });

    /**
     * Step 2: Iterate over `result.fullStream`.
     *
     * `result.fullStream` is an AsyncIterable yielding all event chunks
     * including reasoning, tool calls, text deltas, and lifecycle events.
     */
    for await (const chunk of result.fullStream) {
      switch (chunk.type) {
        case "start": {
          // Stream has opened
          break;
        }

        case "reasoning-start": {
          timeToFirstThought = performance.now() - startTime;
          console.log(
            `${ANSI.bold}${ANSI.amber}┌── [THINKING / REASONING STARTED] (TTFT: ${Math.round(timeToFirstThought)}ms)${ANSI.reset}`
          );
          process.stdout.write(ANSI.amber + ANSI.italic);
          break;
        }

        case "reasoning-delta": {
          // `chunk.text` contains the incremental thought tokens!
          const delta = chunk.text;
          totalThoughtChars += delta.length;
          process.stdout.write(delta);
          break;
        }

        case "reasoning-end": {
          thinkingEndTime = performance.now();
          const thinkingDuration = Math.round(thinkingEndTime - (startTime + (timeToFirstThought ?? 0)));
          process.stdout.write(ANSI.reset);
          console.log(
            `\n${ANSI.bold}${ANSI.amber}└── [THINKING COMPLETED] (Duration: ${thinkingDuration}ms | ${totalThoughtChars} chars)${ANSI.reset}\n`
          );
          break;
        }

        case "text-start": {
          timeToFirstAnswer = performance.now() - startTime;
          console.log(
            `${ANSI.bold}${ANSI.green}┌── [FINAL ANSWER STREAMING] (Time to Answer: ${Math.round(timeToFirstAnswer)}ms)${ANSI.reset}`
          );
          process.stdout.write(ANSI.reset);
          break;
        }

        case "text-delta": {
          // `chunk.text` contains the incremental final answer tokens!
          const delta = chunk.text;
          totalAnswerChars += delta.length;
          process.stdout.write(delta);
          break;
        }

        case "text-end": {
          console.log(
            `\n${ANSI.bold}${ANSI.green}└── [FINAL ANSWER COMPLETED] (${totalAnswerChars} chars)${ANSI.reset}\n`
          );
          break;
        }

        case "finish": {
          const totalDuration = Math.round(performance.now() - startTime);
          console.log(`${ANSI.bold}${ANSI.cyan}=== GENERATION SUMMARY ===${ANSI.reset}`);
          console.log(`${ANSI.gray}Time to First Thought (TTFT):${ANSI.reset}  ${Math.round(timeToFirstThought ?? 0)} ms`);
          console.log(`${ANSI.gray}Time to First Answer (TTFA):${ANSI.reset}   ${Math.round(timeToFirstAnswer ?? 0)} ms`);
          console.log(`${ANSI.gray}Total Generation Time:${ANSI.reset}         ${totalDuration} ms`);

          if (chunk.totalUsage) {
            console.log(`${ANSI.gray}Input Tokens:${ANSI.reset}                  ${chunk.totalUsage.inputTokens}`);
            console.log(`${ANSI.gray}Output Tokens:${ANSI.reset}                 ${chunk.totalUsage.outputTokens}`);
            console.log(`${ANSI.gray}Total Tokens:${ANSI.reset}                  ${chunk.totalUsage.totalTokens}`);
          }
          break;
        }

        case "error": {
          console.error(`\n${ANSI.bold}\x1b[31m[STREAM ERROR]${ANSI.reset}`, chunk.error);
          break;
        }

        default:
          // Other chunk types: start-step, finish-step, tool-call, etc.
          break;
      }
    }

    // You can also inspect the full accumulated reasoning text via `result.reasoningText`
    const fullReasoning = await result.reasoningText;
    if (fullReasoning && totalThoughtChars === 0) {
      console.log(`\n${ANSI.dim}Accumulated Reasoning Text length: ${fullReasoning.length} characters${ANSI.reset}`);
    }
  } catch (err) {
    console.error(`\n${ANSI.bold}\x1b[31mExecution failed:${ANSI.reset}`, err);
  }
}

void main();

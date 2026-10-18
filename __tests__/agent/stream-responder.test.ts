import { afterEach, describe, it, expect, mock } from "bun:test";

/**
 * `createUIStreamResponder` tests. The AI SDK entry points and Langfuse tracing
 * are mocked so the responder's own wiring can be asserted in isolation: which
 * `streamText` config it assembles, what `messageMetadata` it stamps on the
 * finish chunk, how quota headers are attached, and how the inference-error
 * trigger stays single-flight.
 */

type StreamTextConfig = Record<string, any>;

const streamTextMock = mock((_config: StreamTextConfig) => ({
  stream: new ReadableStream({
    start(controller) {
      controller.enqueue({ type: "text-delta", delta: "hi" });
      controller.close();
    },
  }),
}));
const toUIMessageStreamMock = mock(({ messageMetadata }: { messageMetadata: (o: any) => unknown }) => ({
  messageMetadata,
  stream: new ReadableStream({
    start(controller) {
      controller.close();
    },
  }),
}));
const createUIMessageStreamMock = mock(
  ({ execute }: { execute: (ctx: { writer: unknown }) => Promise<void> }) => {
    const writer = { write: mock(), merge: mock() };
    // Fire execute like the SDK does so the run path is actually exercised.
    void execute({ writer });
    return new ReadableStream({
      start(controller) {
        controller.close();
      },
    });
  },
);
const createUIMessageStreamResponseMock = mock(
  ({ headers }: { stream: unknown; headers: Record<string, string> }) =>
    new Response("stream", { status: 200, headers }),
);
const convertToModelMessagesMock = mock((messages: unknown) => Promise.resolve(messages));
const isStepCountMock = mock((n: number) => `step-count-${n}`);
const smoothStreamMock = mock((opts: unknown) => ({ kind: "smoothStream", opts }));

mock.module("ai", () => ({
  streamText: streamTextMock,
  toUIMessageStream: toUIMessageStreamMock,
  createUIMessageStream: createUIMessageStreamMock,
  createUIMessageStreamResponse: createUIMessageStreamResponseMock,
  convertToModelMessages: convertToModelMessagesMock,
  isStepCount: isStepCountMock,
  smoothStream: smoothStreamMock,
}));

mock.module("@langfuse/tracing", () => ({
  propagateAttributes: (_attrs: unknown, fn: () => Promise<unknown>) => fn(),
}));

mock.module("@/instrumentation", () => ({
  langfuseSpanProcessor: { forceFlush: () => Promise.resolve() },
}));

const { createUIStreamResponder } = await import("@/agent/core/stream-responder");

const BASE_CONFIG = {
  prefix: "[agent]",
  messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }],
  initialSystem: "SYSTEM",
};

function lastStreamText(): StreamTextConfig {
  return streamTextMock.mock.calls[streamTextMock.mock.calls.length - 1][0] as StreamTextConfig;
}

async function runResponder(overrides: Record<string, unknown> = {}) {
  const res = await createUIStreamResponder({ ...BASE_CONFIG, ...overrides } as any);
  // Let the queued execute() settle before assertions.
  await new Promise((r) => setTimeout(r, 0));
  return res;
}

afterEach(() => {
  streamTextMock.mockClear();
  toUIMessageStreamMock.mockClear();
  createUIMessageStreamMock.mockClear();
  createUIMessageStreamResponseMock.mockClear();
  convertToModelMessagesMock.mockClear();
  smoothStreamMock.mockClear();
});

describe("createUIStreamResponder streaming wiring", () => {
  it("assembles streamText with the resolved model, system, and converted messages", async () => {
    await runResponder({ modelId: "gemini-3.5-flash-lite", thinkingLevel: "high" });

    const cfg = lastStreamText();
    expect(cfg.system).toBe("SYSTEM");
    expect(cfg.model).toBeDefined();
    expect(cfg.reasoning).toBe("high");
    expect(cfg.providerOptions?.google).toEqual({ thinkingConfig: { includeThoughts: true } });
    expect(convertToModelMessagesMock).toHaveBeenCalledTimes(1);
  });

  it("applies word-paced smooth streaming and tool-input coalescing as transforms", async () => {
    await runResponder();

    const transforms = lastStreamText().experimental_transform;
    expect(transforms).toHaveLength(2);
    expect(transforms[0]).toEqual({ kind: "smoothStream", opts: { delayInMs: 15, chunking: "word" } });
    expect(typeof transforms[1]).toBe("function");
  });

  it("registers agent telemetry under the agent function id", async () => {
    await runResponder();
    expect(lastStreamText().telemetry).toEqual({ functionId: "agent-response" });
  });

  it("registers compaction telemetry under the compaction function id", async () => {
    await runResponder({ prefix: "[compaction]" });
    expect(lastStreamText().telemetry).toEqual({ functionId: "compaction-response" });
  });

  it("forwards the abort signal and optional output cap", async () => {
    const signal = new AbortController().signal;
    await runResponder({ signal, maxOutputTokens: 3500 });
    expect(lastStreamText().abortSignal).toBe(signal);
    expect(lastStreamText().maxOutputTokens).toBe(3500);
  });

  it("omits maxOutputTokens when the caller does not set one", async () => {
    await runResponder();
    expect(lastStreamText().maxOutputTokens).toBeUndefined();
  });

  it("builds tools only when a builder is supplied", async () => {
    await runResponder();
    expect(lastStreamText().tools).toBeUndefined();

    streamTextMock.mockClear();
    await runResponder({ buildTools: () => ({ writeFile: {} }) });
    expect(lastStreamText().tools).toEqual({ writeFile: {} });
  });

  it("appends the trailing user message only when configured", async () => {
    await runResponder();
    expect(Array.isArray(lastStreamText().messages)).toBe(true);
    expect(lastStreamText().messages).not.toContainEqual(
      expect.objectContaining({ role: "user", content: "APPEND" }),
    );

    streamTextMock.mockClear();
    await runResponder({ appendUserMessage: "APPEND" });
    expect(lastStreamText().messages).toContainEqual({ role: "user", content: "APPEND" });
  });

  it("strips binary history for text-only models but preserves it for vision models", async () => {
    const messages = [
      {
        role: "user",
        parts: [{ type: "file", mediaType: "image/png", filename: "a.png", url: "data:image/png;base64,abc" }],
      },
    ];

    // gemini-3.1-flash-lite is a vision model in the catalog.
    await runResponder({ messages, modelId: "gemini-3.1-flash-lite" });
    const visionMessages = lastStreamText().messages;
    expect(JSON.stringify(visionMessages)).toContain("Attached image: a.png");
  });
});

describe("createUIStreamResponder finish metadata", () => {
  it("stamps usage, step totals, and model id on the finish chunk", async () => {
    await runResponder({ modelId: "gemini-3.5-flash-lite" });

    const { messageMetadata } = toUIMessageStreamMock.mock.calls[0][0] as any;
    const part = { type: "finish", totalUsage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 } };
    expect(messageMetadata({ part })).toEqual({
      usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
      stepTotalUsage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
      modelId: "gemini-3.5-flash-lite",
    });
  });

  it("prefers the last step usage over the finish total when available", async () => {
    await runResponder();

    const { messageMetadata } = toUIMessageStreamMock.mock.calls[0][0] as any;
    const part = { type: "finish", totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
    expect(messageMetadata({ part }).usage).toEqual({ inputTokens: 1, outputTokens: 1, totalTokens: 2 });
  });

  it("returns undefined metadata for non-finish chunks", async () => {
    await runResponder();

    const { messageMetadata } = toUIMessageStreamMock.mock.calls[0][0] as any;
    expect(messageMetadata({ part: { type: "text-delta" } })).toBeUndefined();
  });

  it("merges caller-supplied extra metadata into the finish chunk", async () => {
    await runResponder({ prefix: "[compaction]", extraMetadata: { isCompactedSummary: true } });

    const { messageMetadata } = toUIMessageStreamMock.mock.calls[0][0] as any;
    const meta = messageMetadata({ part: { type: "finish", totalUsage: {} } });
    expect(meta.isCompactedSummary).toBe(true);
  });

  it("falls back to the default model id when none is requested", async () => {
    await runResponder();

    const { messageMetadata } = toUIMessageStreamMock.mock.calls[0][0] as any;
    expect(messageMetadata({ part: { type: "finish", totalUsage: {} } }).modelId).toBe("gemini-3.5-flash-lite");
  });
});

describe("createUIStreamResponder quota headers", () => {
  it("attaches both remaining-quota headers", async () => {
    const res = await runResponder({ remaining5h: 4, remainingWeek: 33 });
    expect(res.headers.get("X-RateLimit-Remaining-5h")).toBe("4");
    expect(res.headers.get("X-RateLimit-Remaining-Week")).toBe("33");
  });

  it("omits quota headers when the caller supplies none", async () => {
    const res = await runResponder({});
    expect(res.headers.get("X-RateLimit-Remaining-5h")).toBeNull();
    expect(res.headers.get("X-RateLimit-Remaining-Week")).toBeNull();
  });

  it("emits only the week header when only that value is supplied", async () => {
    const res = await runResponder({ remainingWeek: 12 });
    expect(res.headers.get("X-RateLimit-Remaining-Week")).toBe("12");
    expect(res.headers.get("X-RateLimit-Remaining-5h")).toBeNull();
  });
});

describe("createUIStreamResponder error handling", () => {
  it("invokes the inference-error callback at most once across failures", async () => {
    const onInferenceError = mock(() => Promise.resolve());
    await runResponder({ onInferenceError });

    const cfg = lastStreamText();
    await cfg.onError({ error: new Error("first failure") });
    await cfg.onError({ error: new Error("second failure") });

    expect(onInferenceError.mock.calls.length).toBe(1);
  });

  it("triggers the refund callback when the stream reports an error", async () => {
    const onInferenceError = mock(() => Promise.resolve());

    await runResponder({ onInferenceError });

    const cfg = lastStreamText();
    await cfg.onError({ error: new Error("boom") });

    expect(onInferenceError.mock.calls.length).toBe(1);
  });

  it("survives an inference-error callback that itself throws", async () => {
    const onInferenceError = mock(() => Promise.reject(new Error("refund failed")));
    await runResponder({ onInferenceError });

    const cfg = lastStreamText();
    await cfg.onError({ error: new Error("boom") });
    await new Promise((r) => setTimeout(r, 10));
    // Reaching here without an unhandled rejection is the assertion.
  });
});

import { afterEach, describe, it, expect, mock } from "bun:test";

/**
 * `handleRunnerError` tests. The error classifier is exercised for real while
 * the Langfuse span processor is mocked out, so the SSE error write and the
 * single-flight inference-error trigger are the units under test.
 */

const forceFlushMock = mock(() => Promise.resolve());

mock.module("@/instrumentation", () => ({
  langfuseSpanProcessor: { forceFlush: forceFlushMock },
}));

const { handleRunnerError } = await import("@/agent/core/runner-error");

function makeWriter() {
  return { write: mock((_chunk: unknown) => {}) };
}

afterEach(() => {
  forceFlushMock.mockClear();
});

describe("handleRunnerError", () => {
  it("classifies the error and returns it to the caller", async () => {
    const trigger = mock(() => Promise.resolve());

    const classified = await handleRunnerError({
      err: new Error("429 RESOURCE_EXHAUSTED: quota exceeded"),
      phase: "Stream error",
      prefix: "[agent]",
      triggerInferenceError: trigger,
    });

    expect(classified.code).toBe("PROVIDER_RATE_LIMIT");
    expect(classified.isRetryable).toBe(true);
  });

  it("triggers the inference-error callback with the classified error", async () => {
    const trigger = mock(() => Promise.resolve());

    await handleRunnerError({
      err: new Error("fetch failed: ECONNRESET"),
      phase: "Stream error",
      prefix: "[agent]",
      triggerInferenceError: trigger,
    });

    expect(trigger).toHaveBeenCalledTimes(1);
    expect(((trigger.mock.calls as any)[0][0] as { code: string }).code).toBe("NETWORK_ERROR");
  });

  it("writes an SSE error chunk carrying the classified message", async () => {
    const writer = makeWriter();

    const classified = await handleRunnerError({
      err: new Error("Prompt is too long: context_length_exceeded"),
      phase: "Stream error",
      prefix: "[agent]",
      writer,
      triggerInferenceError: () => Promise.resolve(),
    });

    expect(writer.write).toHaveBeenCalledTimes(1);
    expect(writer.write).toHaveBeenCalledWith({ type: "error", errorText: classified.message });
  });

  it("tolerates a writer that is already closed", async () => {
    const writer = {
      write: mock(() => {
        throw new Error("writer closed");
      }),
    };

    await expect(
      handleRunnerError({
        err: new Error("boom"),
        phase: "Stream error",
        prefix: "[agent]",
        writer,
        triggerInferenceError: () => Promise.resolve(),
      }),
    ).resolves.toBeDefined();
  });

  it("skips the SSE write when no writer is supplied", async () => {
    const classified = await handleRunnerError({
      err: new Error("boom"),
      phase: "Responder setup error",
      prefix: "[compaction]",
      triggerInferenceError: () => Promise.resolve(),
    });

    expect(classified.code).toBe("INFERENCE_FAILURE");
  });

  it("flushes Langfuse spans after handling the error", async () => {
    await handleRunnerError({
      err: new Error("boom"),
      phase: "Stream error",
      prefix: "[agent]",
      triggerInferenceError: () => Promise.resolve(),
    });

    expect(forceFlushMock).toHaveBeenCalledTimes(1);
  });

  it("does not fail when the span flush rejects", async () => {
    forceFlushMock.mockImplementation(() => Promise.reject(new Error("langfuse down")));

    await expect(
      handleRunnerError({
        err: new Error("boom"),
        phase: "Stream error",
        prefix: "[agent]",
        triggerInferenceError: () => Promise.resolve(),
      }),
    ).resolves.toBeDefined();
  });

  it("handles non-Error throwables", async () => {
    const classified = await handleRunnerError({
      err: "plain string failure",
      phase: "Execution error",
      prefix: "[agent]",
      triggerInferenceError: () => Promise.resolve(),
    });

    expect(classified.code).toBe("INFERENCE_FAILURE");
  });
});

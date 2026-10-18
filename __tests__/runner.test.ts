import { afterEach, describe, it, expect, mock } from "bun:test";

/**
 * Runner config-delta tests. `createUIStreamResponder` is mocked so the tests
 * assert exactly what `runAgentResponse` / `runCompactionResponse` hand to the
 * shared streaming choke point — the invariant that both paths differ only by
 * configuration.
 */

const responderMock = mock((_config: unknown) => Promise.resolve(new Response("streamed")));

mock.module("@/agent/core/stream-responder", () => ({
  createUIStreamResponder: responderMock,
}));

const { runAgentResponse, runCompactionResponse } = await import("@/agent/core/runner");
const { COMPACTION_MODEL_ID, COMPACTION_THINKING_LEVEL } = await import("@/lib/ai/models");
const { createMutableWorkspace } = await import("@/agent/workspace");
const { makeFile } = await import("./helpers");

function config() {
  return responderMock.mock.calls[responderMock.mock.calls.length - 1][0] as any;
}

afterEach(() => {
  responderMock.mockClear();
  responderMock.mockImplementation((_config: unknown) => Promise.resolve(new Response("streamed")));
});

describe("runAgentResponse", () => {
  const workspace = () => createMutableWorkspace([makeFile("f1", "notes.md", "hello", "markdown")]);

  it("forwards the agent prefix and a system instruction seeded from workspace files", async () => {
    await runAgentResponse({
      workspace: workspace(),
      messages: [],
      maxSteps: 25,
      remaining5h: 9,
      remainingWeek: 49,
    });

    expect(config().prefix).toBe("[agent]");
    expect(config().initialSystem).toContain("- notes.md (markdown, 5/10,000 chars, id: f1)");
    expect(config().initialSystem).toContain("Status: Populated");
  });

  it("wires the agent stopWhen cap and builds workspace tools with the writer", async () => {
    await runAgentResponse({
      workspace: workspace(),
      messages: [],
      maxSteps: 7,
      remaining5h: 9,
      remainingWeek: 49,
    });

    const cfg = config();
    expect(cfg.stopWhen).toBeDefined();
    expect(typeof cfg.buildTools).toBe("function");

    const writer = { write: mock() };
    const tools = cfg.buildTools(writer);
    expect(Object.keys(tools).sort()).toEqual([
      "deleteFile",
      "editFile",
      "extractUrl",
      "listFiles",
      "readFile",
      "renameFile",
      "webSearch",
      "writeFile",
    ]);
  });

  it("re-injects the system instruction on every step with the token budget attached", async () => {
    const ws = workspace();
    await runAgentResponse({
      workspace: ws,
      messages: [
        {
          role: "assistant",
          parts: [],
          metadata: {
            usage: { inputTokens: 1000, outputTokens: 100, totalTokens: 1100 },
            modelId: "gemini-3.5-flash-lite",
          },
        },
      ],
      maxSteps: 25,
      remaining5h: 9,
      remainingWeek: 49,
    });

    const prepareStep = config().prepareStep;
    const step = await prepareStep({ stepNumber: 2 });
    expect(step.system).toContain("## Context & Token Budget");
    expect(step.system).toContain("1,100 / 131,072 tokens");
  });

  it("reflects live workspace mutations in the per-step system instruction", async () => {
    const ws = workspace();
    await runAgentResponse({
      workspace: ws,
      messages: [],
      maxSteps: 25,
      remaining5h: 9,
      remainingWeek: 49,
    });

    ws.onUpdateFile(makeFile("f2", "added.md", "new file", "markdown"));
    const step = await config().prepareStep({ stepNumber: 3 });
    expect(step.system).toContain("added.md");
  });

  it("forwards quota, correlation, and abort-signal fields untouched", async () => {
    const signal = new AbortController().signal;
    const onInferenceError = mock(() => Promise.resolve());

    await runAgentResponse({
      workspace: workspace(),
      messages: [],
      modelId: "accounts/fireworks/models/glm-5p3-flash",
      thinkingLevel: "high",
      maxSteps: 12,
      signal,
      remaining5h: 3,
      remainingWeek: 41,
      userId: "user-1",
      sessionId: "session-1",
      onInferenceError,
    });

    const cfg = config();
    expect(cfg.modelId).toBe("accounts/fireworks/models/glm-5p3-flash");
    expect(cfg.thinkingLevel).toBe("high");
    expect(cfg.signal).toBe(signal);
    expect(cfg.remaining5h).toBe(3);
    expect(cfg.remainingWeek).toBe(41);
    expect(cfg.userId).toBe("user-1");
    expect(cfg.sessionId).toBe("session-1");
    expect(cfg.onInferenceError).toBe(onInferenceError);
    expect(cfg.maxOutputTokens).toBeUndefined();
    expect(cfg.extraMetadata).toBeUndefined();
  });
});

describe("runCompactionResponse", () => {
  it("pins the compaction model and thinking level regardless of client input", async () => {
    await runCompactionResponse({
      messages: [],
      modelId: "ignored-by-design",
      thinkingLevel: "minimal",
      remaining5h: 5,
      remainingWeek: 30,
    });

    const cfg = config();
    expect(cfg.prefix).toBe("[compaction]");
    expect(cfg.modelId).toBe(COMPACTION_MODEL_ID);
    expect(cfg.thinkingLevel).toBe(COMPACTION_THINKING_LEVEL);
  });

  it("caps output tokens and stamps the compaction metadata", async () => {
    await runCompactionResponse({ messages: [], files: [] });

    expect(config().maxOutputTokens).toBe(3500);
    expect(config().extraMetadata).toEqual({ isCompactedSummary: true });
  });

  it("appends a trailing user instruction to force the summary", async () => {
    await runCompactionResponse({ messages: [] });
    expect(config().appendUserMessage).toContain("context compaction summary");
  });

  it("builds its system instruction from the supplied workspace files", async () => {
    await runCompactionResponse({
      messages: [],
      files: [makeFile("f1", "plan.md", "roadmap", "markdown")],
    });

    const cfg = config();
    expect(cfg.initialSystem).toContain("context compaction specialist");
    expect(cfg.initialSystem).toContain("Workspace Files Status: Populated");
    expect(cfg.initialSystem).toContain("- plan.md (markdown, 7/10,000 chars, id: f1)");
  });

  it("registers no workspace tools and no step cap", async () => {
    await runCompactionResponse({ messages: [], files: [] });

    const cfg = config();
    expect(cfg.buildTools).toBeUndefined();
    expect(cfg.stopWhen).toBeUndefined();
    expect(cfg.prepareStep).toBeUndefined();
  });

  it("forwards the abort signal and correlation fields", async () => {
    const signal = new AbortController().signal;
    await runCompactionResponse({
      messages: [],
      signal,
      remaining5h: 2,
      remainingWeek: 20,
      userId: "user-9",
      sessionId: "session-9",
    });

    expect(config().signal).toBe(signal);
    expect(config().userId).toBe("user-9");
    expect(config().sessionId).toBe("session-9");
  });
});

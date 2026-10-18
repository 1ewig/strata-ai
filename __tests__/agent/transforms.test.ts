import { describe, it, expect } from "bun:test";
import { coalesceToolInputDeltas } from "@/agent/core/transforms";

/**
 * Feeds chunks through a coalesceToolInputDeltas TransformStream and collects
 * the emitted chunks in order.
 */
async function run(chunks: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> {
  // Mirrors how the AI SDK applies an experimental_transform entry: the outer
  // call returns a factory, invoking it yields the actual TransformStream.
  const factory = coalesceToolInputDeltas() as unknown as () => TransformStream<any, any>;
  const { readable, writable } = factory();
  const collected: Array<Record<string, unknown>> = [];
  const reader = readable.getReader();

  void (async () => {
    const writer = writable.getWriter();
    for (const chunk of chunks) {
      await writer.write(chunk);
    }
    await writer.close();
  })();

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    collected.push(value as Record<string, unknown>);
  }
  return collected;
}

describe("coalesceToolInputDeltas", () => {
  it("buffers tool-input-delta chunks per tool id and flushes on tool-input-end", async () => {
    const out = await run([
      { type: "tool-input-delta", id: "call-1", delta: '{"na' },
      { type: "tool-input-delta", id: "call-1", delta: 'me":"a' },
      { type: "tool-input-delta", id: "call-1", delta: '.md"}' },
      { type: "tool-input-end", id: "call-1" },
    ]);

    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      type: "tool-input-delta",
      id: "call-1",
      delta: '{"name":"a.md"}',
    });
    expect(out[1]).toEqual({ type: "tool-input-end", id: "call-1" });
  });

  it("flushes a buffered delta when the tool call part arrives instead", async () => {
    const out = await run([
      { type: "tool-input-delta", id: "call-1", delta: "a" },
      { type: "tool-input-delta", id: "call-1", delta: "b" },
      { type: "tool-call", id: "call-1", toolName: "writeFile" },
    ]);

    expect(out[0]).toEqual({ type: "tool-input-delta", id: "call-1", delta: "ab" });
    expect(out[1]).toEqual({ type: "tool-call", id: "call-1", toolName: "writeFile" });
  });

  it("keeps separate tool ids in separate buffers and preserves stream order", async () => {
    const out = await run([
      { type: "tool-input-delta", id: "call-1", delta: "one" },
      { type: "tool-input-delta", id: "call-2", delta: "two" },
      { type: "tool-input-delta", id: "call-1", delta: "!" },
      { type: "tool-input-end", id: "call-2" },
      { type: "tool-input-end", id: "call-1" },
    ]);

    expect(out).toHaveLength(4);
    expect(out[0]).toEqual({ type: "tool-input-delta", id: "call-2", delta: "two" });
    expect(out[1]).toEqual({ type: "tool-input-end", id: "call-2" });
    expect(out[2]).toEqual({ type: "tool-input-delta", id: "call-1", delta: "one!" });
    expect(out[3]).toEqual({ type: "tool-input-end", id: "call-1" });
  });

  it("flushes any still-buffered deltas when the stream closes", async () => {
    const out = await run([
      { type: "tool-input-delta", id: "call-1", delta: "leftover" },
      { type: "text-delta", id: "t1", delta: "hi" },
    ]);

    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ type: "text-delta", id: "t1", delta: "hi" });
    expect(out[1]).toEqual({ type: "tool-input-delta", id: "call-1", delta: "leftover" });
  });

  it("emits no delta when the buffer is empty at flush time", async () => {
    const out = await run([
      { type: "tool-input-end", id: "call-1" },
      { type: "text", text: "done" },
    ]);

    expect(out).toEqual([
      { type: "tool-input-end", id: "call-1" },
      { type: "text", text: "done" },
    ]);
  });

  it("carries the latest providerMetadata onto the flushed delta", async () => {
    const out = await run([
      { type: "tool-input-delta", id: "call-1", delta: "x", providerMetadata: { google: { a: 1 } } },
      { type: "tool-input-delta", id: "call-1", delta: "y" },
      { type: "tool-input-end", id: "call-1" },
    ]);

    expect(out[0]).toEqual({
      type: "tool-input-delta",
      id: "call-1",
      delta: "xy",
      providerMetadata: { google: { a: 1 } },
    });
  });

  it("updates providerMetadata to the newest value seen", async () => {
    const out = await run([
      { type: "tool-input-delta", id: "call-1", delta: "x", providerMetadata: { google: { v: 1 } } },
      { type: "tool-input-delta", id: "call-1", delta: "y", providerMetadata: { google: { v: 2 } } },
      { type: "tool-input-end", id: "call-1" },
    ]);

    expect((out[0] as { providerMetadata: unknown }).providerMetadata).toEqual({ google: { v: 2 } });
  });

  it("passes non-delta chunks through untouched", async () => {
    const out = await run([
      { type: "start" },
      { type: "finish-step" },
    ]);

    expect(out).toEqual([{ type: "start" }, { type: "finish-step" }]);
  });
});

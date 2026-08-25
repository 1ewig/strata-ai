/**
 * Server-side stream transform that buffers and coalesces `tool-input-delta` chunks
 * per tool call before emitting them to the client.
 *
 * Prevents client-side UI freezes caused by AI SDK 7's message reducer running O(N * length)
 * `parsePartialJson` + `fixJson()` operations on every token chunk of large tool arguments.
 */
export function coalesceToolInputDeltas() {
  return () => {
    const buffers = new Map<
      string,
      { delta: string; chunkCount: number; providerMetadata?: unknown }
    >();

    function flush(id: string, controller: TransformStreamDefaultController) {
      const entry = buffers.get(id);
      if (entry && entry.delta.length > 0) {
        console.log(
          `[agent] Coalesced tool-input-delta for tool call "${id}": ${entry.delta.length} chars across ${entry.chunkCount} chunks.`
        );
        controller.enqueue({
          type: "tool-input-delta",
          id,
          delta: entry.delta,
          ...(entry.providerMetadata ? { providerMetadata: entry.providerMetadata } : {}),
        });
        buffers.delete(id);
      }
    }

    return new TransformStream({
      async transform(chunk: any, controller) {
        if (chunk.type === "tool-input-delta") {
          const existing = buffers.get(chunk.id);
          if (existing) {
            existing.delta += chunk.delta;
            existing.chunkCount += 1;
            if (chunk.providerMetadata) {
              existing.providerMetadata = chunk.providerMetadata;
            }
          } else {
            buffers.set(chunk.id, {
              delta: chunk.delta,
              chunkCount: 1,
              providerMetadata: chunk.providerMetadata,
            });
          }
          return;
        }

        if ((chunk.type === "tool-input-end" || chunk.type === "tool-call") && chunk.id) {
          flush(chunk.id, controller);
        }

        controller.enqueue(chunk);
      },
      async flush(controller) {
        for (const id of Array.from(buffers.keys())) {
          flush(id, controller);
        }
      },
    });
  };
}

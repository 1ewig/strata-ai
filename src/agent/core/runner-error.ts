import { classifyProviderError, type ClassifiedError } from "./error-classifier";
import { langfuseSpanProcessor } from "@/instrumentation";

export interface RunnerErrorHandlerOptions {
  err: unknown;
  phase: string;
  prefix: string;
  writer?: { write: (chunk: { type: "error"; errorText: string }) => void };
  triggerInferenceError: (classified: ClassifiedError) => Promise<void>;
}

/**
 * Classifies an inference error, writes the error SSE chunk, invokes the quota refund
 * callback, and flushes Langfuse spans.
 */
export async function handleRunnerError({
  err,
  phase,
  prefix,
  writer,
  triggerInferenceError,
}: RunnerErrorHandlerOptions): Promise<ClassifiedError> {
  const classified = classifyProviderError(err);
  console.error(`${prefix} ${phase} [${classified.code}]:`, err);
  await triggerInferenceError(classified);

  if (writer) {
    try {
      writer.write({
        type: "error",
        errorText: classified.message,
      });
    } catch {
      // Writer might already be closed
    }
  }

  void langfuseSpanProcessor.forceFlush().catch((flushErr) => {
    console.warn(`${prefix} Langfuse span flush error:`, flushErr);
  });

  return classified;
}

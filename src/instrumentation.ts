import { registerTelemetry } from "ai";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

/**
 * Shared Langfuse span processor instance for exporting traces to Langfuse.
 */
export const langfuseSpanProcessor = new LangfuseSpanProcessor();

/**
 * Next.js instrumentation hook.
 * Initializes OpenTelemetry and registers the Langfuse Vercel AI SDK 7 integration
 * on server startup.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const tracerProvider = new NodeTracerProvider({
      spanProcessors: [langfuseSpanProcessor],
    });
    tracerProvider.register();
    registerTelemetry(new LangfuseVercelAiSdkIntegration());
  }
}

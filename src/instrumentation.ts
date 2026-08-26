import { registerTelemetry } from "ai";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";
import { NodeSDK } from "@opentelemetry/sdk-node";

/**
 * Shared Langfuse span processor instance for exporting traces to Langfuse.
 * Configured with immediate export mode to ensure traces are dispatched
 * reliably without delay in Next.js streaming / serverless environments.
 */
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
  exportMode: "immediate",
});

/**
 * Next.js instrumentation hook.
 * Initializes OpenTelemetry NodeSDK and registers the Langfuse Vercel AI SDK 7 integration
 * on server startup.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const sdk = new NodeSDK({
      spanProcessors: [langfuseSpanProcessor],
    });
    sdk.start();
    registerTelemetry(new LangfuseVercelAiSdkIntegration());
    console.log("[instrumentation] Langfuse OpenTelemetry NodeSDK & AI SDK telemetry initialized.");
  }
}

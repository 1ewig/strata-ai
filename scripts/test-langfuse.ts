import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { trace } from "@opentelemetry/api";

console.log("LANGFUSE_PUBLIC_KEY:", process.env.LANGFUSE_PUBLIC_KEY ? `${process.env.LANGFUSE_PUBLIC_KEY.slice(0, 10)}...` : "NOT SET");
console.log("LANGFUSE_SECRET_KEY:", process.env.LANGFUSE_SECRET_KEY ? `${process.env.LANGFUSE_SECRET_KEY.slice(0, 10)}...` : "NOT SET");
console.log("LANGFUSE_BASE_URL:", process.env.LANGFUSE_BASE_URL || "NOT SET (will default to https://cloud.langfuse.com)");

const processor = new LangfuseSpanProcessor({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
  exportMode: "immediate",
});

const sdk = new NodeSDK({
  spanProcessors: [processor],
});

sdk.start();

const tracer = trace.getTracer("test-tracer");
const span = tracer.startSpan("langfuse-connection-test", {
  attributes: {
    "test.status": "success",
    "test.timestamp": new Date().toISOString(),
  },
});

span.end();

console.log("Flushing Langfuse spans...");
await processor.forceFlush();
console.log("Force flush completed successfully!");
await sdk.shutdown();
console.log("SDK shutdown complete.");

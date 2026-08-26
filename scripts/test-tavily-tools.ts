import { createWebSearchTool, createExtractUrlTool } from "../src/lib/ai/tools/tavily-tools";

console.log("=== TAVILY TOOLS DIAGNOSTIC TEST ===");
console.log("Environment TAVILY_API_KEY:", process.env.TAVILY_API_KEY ? `Present (length ${process.env.TAVILY_API_KEY.length})` : "MISSING");

// Test 1: Direct HTTP call to Tavily API
console.log("\n--- TEST 1: Direct POST https://api.tavily.com/search ---");
try {
  const startTime = Date.now();
  const directRes = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query: "Next.js 16 latest features",
      search_depth: "basic",
      max_results: 3,
    }),
  });

  const duration = Date.now() - startTime;
  console.log(`Direct HTTP Status: ${directRes.status} ${directRes.statusText} (${duration}ms)`);

  if (!directRes.ok) {
    const errorBody = await directRes.text();
    console.error("Direct HTTP Error Body:", errorBody);
  } else {
    const data = await directRes.json();
    console.log("Direct HTTP Success! Results count:", data.results?.length || 0);
    if (data.results && data.results.length > 0) {
      console.log("First Result Title:", data.results[0].title);
      console.log("First Result URL:", data.results[0].url);
    }
  }
} catch (directErr: any) {
  console.error("Direct HTTP Exception:", directErr);
  if (directErr.cause) {
    console.error("Direct HTTP Error Cause:", directErr.cause);
  }
}

// Test 2: AI SDK webSearch tool execution
console.log("\n--- TEST 2: AI SDK webSearch tool execution ---");
try {
  const webSearchTool = createWebSearchTool();
  console.log("Executing webSearch tool with query: 'Next.js 16 App Router'...");
  const toolResult = await (webSearchTool as any).execute({
    query: "Next.js 16 App Router",
    searchDepth: "basic",
    maxResults: 3,
  });

  console.log("Tool Result Output:", JSON.stringify(toolResult, null, 2));
} catch (toolErr) {
  console.error("webSearch Tool Exception:", toolErr);
}

// Test 3: AI SDK extractUrl tool execution
console.log("\n--- TEST 3: AI SDK extractUrl tool execution ---");
try {
  const extractTool = createExtractUrlTool();
  console.log("Executing extractUrl tool with URL: 'https://example.com'...");
  const extractResult = await (extractTool as any).execute({
    urls: ["https://example.com"],
  });

  console.log("Extract Tool Result Output:", JSON.stringify(extractResult, null, 2));
} catch (extractErr) {
  console.error("extractUrl Tool Exception:", extractErr);
}

console.log("\n=== TEST COMPLETED ===");

import { z } from "zod";
import { runAgentChat } from "@/lib/ai/agent";
import { ResumeSchema } from "@/lib/schemas";

const IncomingMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  content: z.string(),
  toolCalls: z.array(z.any()).optional(),
});

const bodySchema = z.object({
  messages: z.array(IncomingMessageSchema),
  resumes: z.array(ResumeSchema),
  model: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { resumes, model } = parsed.data;
    const messages = parsed.data.messages as any[];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const result = await runAgentChat(messages, resumes, model, (chunk) => {
            sendEvent("text_chunk", chunk);
          });

          sendEvent("done", {
            resumes: result.resumes,
            toolCalls: result.toolCalls,
          });
        } catch (error: any) {
          console.error("Error in agent API route:", error);
          sendEvent("error", { message: error.message || "An error occurred inside the ResumeFlow AI agent." });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error in agent API route:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

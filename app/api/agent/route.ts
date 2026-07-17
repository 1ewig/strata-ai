import { NextResponse } from "next/server";
import { z } from "zod";
import { runAgentChat } from "@/lib/ai/agent";
import { TaskSchema } from "@/lib/schemas";

const IncomingMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  content: z.string(),
  toolCalls: z.array(z.any()).optional(),
});

const bodySchema = z.object({
  messages: z.array(IncomingMessageSchema),
  tasks: z.array(TaskSchema),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tasks } = parsed.data;
    const messages = parsed.data.messages as any[];
    const result = await runAgentChat(messages, tasks);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in agent API route:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred inside the AI Task Agent." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { runAgentChat } from "@/lib/ai/agent";
import { ChatMessage } from "@/lib/schemas";

export async function POST(req: Request) {
  try {
    const { messages, tasks } = await req.json();
    const result = await runAgentChat(messages as ChatMessage[], tasks);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in agent API route:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred inside the AI Task Agent." },
      { status: 500 }
    );
  }
}

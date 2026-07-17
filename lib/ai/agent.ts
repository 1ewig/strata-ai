import { getGeminiClient } from "./client";
import { ALL_TOOLS, executeTool } from "./tools";
import { Task, ChatMessage, ToolCall } from "../schemas";

function buildSystemInstruction(tasks: Task[]): string {
  const tasksJson = JSON.stringify(tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    steps: t.steps.map(s => ({
      id: s.id,
      title: s.title,
      completed: s.completed
    }))
  })));

  return `You are TaskFlow, a friendly, detail-oriented, and highly structured AI productivity planner and task breakdown expert.
Your job is to help users manage their task breakdowns, convert massive intimidating goals into tiny, bite-sized, and highly actionable checklists, and organize their schedule.

The user's existing tasks and their step-by-step breakdowns are currently:
${tasksJson}

Key directives:
1. When a user describes a goal, task, or project (e.g., 'Learn to play tennis', 'Clean my messy room', 'Deploy a web app'), you MUST automatically think of 3 to 6 logical, sequentially structured steps. Then, call 'addTask' with the title, description, and the array of step titles as the 'steps' argument. This instantly populates the task breakdown!
2. Always use the actual tools to add, modify, or delete tasks/steps. Do not pretend to make changes—call the correct function tool!
3. If the user wants to add a step to an existing task, call 'addStep' using the correct taskId.
4. If they request to change a task or step title, or mark steps completed/incomplete, use 'updateTask' or 'updateStep' with the corresponding IDs from the task list.
5. Be encouraging, clear, and focused on helping them defeat procrastination. Keep your conversational replies friendly, brief, and highly actionable.`;
}

function mapMessagesToContents(messages: ChatMessage[]): any[] {
  const contents: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: msg.content }]
      });
    } else {
      if (msg.content) {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    }
  }

  return contents;
}

export async function runAgentChat(
  messages: ChatMessage[],
  tasks: Task[],
  model?: string,
  onStream?: (chunk: string) => void
): Promise<{ content: string; tasks: Task[]; toolCalls: ToolCall[] }> {
  const ai = getGeminiClient();
  const systemInstruction = buildSystemInstruction(tasks);
  const contents = mapMessagesToContents(messages);

  const modelName = model || process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3.1-flash-lite";

  let currentTasks = [...tasks];
  const toolCallsExecuted: ToolCall[] = [];
  let loopCount = 0;
  let finalModelResponse = "";

  while (loopCount < 5) {
    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: ALL_TOOLS }],
      }
    });

    const textChunks: string[] = [];
    let aggregatedFunctionCalls: any[] | null = null;
    let aggregatedCandidateContent: any = null;

    for await (const chunk of stream) {
      if (chunk.text) {
        textChunks.push(chunk.text);
      }
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        aggregatedFunctionCalls = chunk.functionCalls;
      }
      if (chunk.candidates?.[0]?.content && !aggregatedCandidateContent) {
        aggregatedCandidateContent = chunk.candidates[0].content;
      }
    }

    if (aggregatedFunctionCalls && aggregatedFunctionCalls.length > 0) {
      const responseParts: any[] = [];
      const modelParts: any[] = [];

      for (const call of aggregatedFunctionCalls) {
        if (!call.name) continue;

        const { result, updatedTasks, updated } = executeTool(call.name, call.args, currentTasks);
        if (updated) {
          currentTasks = updatedTasks;
        }

        toolCallsExecuted.push({
          name: call.name,
          args: call.args,
          result
        });

        modelParts.push({
          functionCall: {
            name: call.name,
            args: call.args
          }
        });

        responseParts.push({
          functionResponse: {
            name: call.name,
            response: result
          }
        });
      }

      if (aggregatedCandidateContent) {
        contents.push(aggregatedCandidateContent);
      } else {
        contents.push({
          role: 'model',
          parts: modelParts
        });
      }

      contents.push({
        role: 'user',
        parts: responseParts
      });

      loopCount++;
    } else {
      finalModelResponse = textChunks.join('');
      for (const chunk of textChunks) {
        onStream?.(chunk);
      }
      break;
    }
  }

  return {
    content: finalModelResponse,
    tasks: currentTasks,
    toolCalls: toolCallsExecuted
  };
}

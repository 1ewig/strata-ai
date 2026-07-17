import { NextResponse } from "next/server";
import { getGeminiClient, ALL_TOOLS, executeTool } from "@/lib/agent";
import { Task } from "@/lib/schemas";

export async function POST(req: Request) {
  try {
    const { messages, tasks } = await req.json();

    // Initialize in-memory tasks
    let currentTasks: Task[] = tasks || [];
    const toolCallsExecuted: any[] = [];

    // Initialize Gemini Client
    const ai = getGeminiClient();

    // Build the system instruction, feeding in the current state of tasks so the model knows what is already present!
    const tasksJson = JSON.stringify(currentTasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      steps: t.steps.map(s => ({
        id: s.id,
        title: s.title,
        completed: s.completed
      }))
    })));

    const systemInstruction = `You are TaskFlow, a friendly, detail-oriented, and highly structured AI productivity planner and task breakdown expert.
Your job is to help users manage their task breakdowns, convert massive intimidating goals into tiny, bite-sized, and highly actionable checklists, and organize their schedule.

The user's existing tasks and their step-by-step breakdowns are currently:
${tasksJson}

Key directives:
1. When a user describes a goal, task, or project (e.g., 'Learn to play tennis', 'Clean my messy room', 'Deploy a web app'), you MUST automatically think of 3 to 6 logical, sequentially structured steps. Then, call 'addTask' with the title, description, and the array of step titles as the 'steps' argument. This instantly populates the task breakdown!
2. Always use the actual tools to add, modify, or delete tasks/steps. Do not pretend to make changes—call the correct function tool!
3. If the user wants to add a step to an existing task, call 'addStep' using the correct taskId.
4. If they request to change a task or step title, or mark steps completed/incomplete, use 'updateTask' or 'updateStep' with the corresponding IDs from the task list.
5. Be encouraging, clear, and focused on helping them defeat procrastination. Keep your conversational replies friendly, brief, and highly actionable.`;

    // Map input messages to Gemini contents structure
    const contents: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else {
        // Model messages: send only the text content. Skip raw functionCalls / functionResponses in history,
        // which prevents "missing thought_signature" ApiErrors completely!
        if (msg.content) {
          contents.push({
            role: 'model',
            parts: [{ text: msg.content }]
          });
        }
      }
    }

    // Run the tool-calling loop (Max 5 iterations)
    let loopCount = 0;
    let finalModelResponse = "";

    while (loopCount < 5) {
      // Query Gemini using model from env (default gemini-3.1-flash-lite)
      const response = await ai.models.generateContent({
        model: process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3.1-flash-lite",
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: ALL_TOOLS }],
        }
      });

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        // Execute the tools on our in-memory state and keep track of executed ones
        const responseParts: any[] = [];
        const modelParts: any[] = [];

        for (const call of functionCalls) {
          if (!call.name) continue;
          // Execute the tool
          const { result, updatedTasks, updated } = executeTool(call.name, call.args, currentTasks);
          if (updated) {
            currentTasks = updatedTasks;
          }

          // Record this tool call for client visualization
          toolCallsExecuted.push({
            name: call.name,
            args: call.args,
            result
          });

          // Compile into the model's functionCalls part
          modelParts.push({
            functionCall: {
              name: call.name,
              args: call.args
            }
          });

          // Compile into the user's functionResponse part
          responseParts.push({
            functionResponse: {
              name: call.name,
              response: result
            }
          });
        }

        // To feed results back to Gemini:
        // 1. Append the model's actual response content (preserving thought_signature if present)
        if (response.candidates?.[0]?.content) {
          contents.push(response.candidates[0].content);
        } else {
          contents.push({
            role: 'model',
            parts: modelParts
          });
        }

        // 2. Append the user's functionResponses to contents
        contents.push({
          role: 'user',
          parts: responseParts
        });

        loopCount++;
      } else {
        // No more tool calls! Extract the text content
        finalModelResponse = response.text || "";
        break;
      }
    }

    // Return the final result
    return NextResponse.json({
      content: finalModelResponse,
      tasks: currentTasks,
      toolCalls: toolCallsExecuted
    });

  } catch (error: any) {
    console.error("Error in agent API route:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred inside the AI Task Agent." },
      { status: 500 }
    );
  }
}

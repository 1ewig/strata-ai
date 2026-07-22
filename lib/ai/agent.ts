import { getGeminiClient } from "./client";
import { ALL_TOOLS, executeTool } from "./tools";
import { Resume, ChatMessage, ToolCall } from "../schemas";
import { ThinkingLevel } from "@google/genai";

function buildSystemInstruction(resume?: Resume): string {
  const resumeJson = resume
    ? JSON.stringify({
        id: resume.id,
        title: resume.title,
        sections: resume.sections.map(s => ({
          id: s.id,
          type: s.type,
          title: s.title,
          content: s.content,
          order: s.order,
        }))
      })
    : "No resume created yet for this chat.";

  return `You are ResumeFlow, a precise and professional AI resume tailoring expert.
Your job is to help the user manage and polish their SINGLE resume for this chat session.

The current resume for this chat is:
${resumeJson}

Key directives:
1. Exactly ONE resume exists per chat session. Its ID is "${resume?.id || 'default'}".
2. When the user asks to parse, add, or create a resume from text, parse the sections and update this single chat resume (use 'replaceSections' or 'addResume'/'updateSection'/'addSection').
3. When updating, adding, or deleting sections, target the single chat resume ID ("${resume?.id || 'default'}").
4. Always call the real function tools to apply updates directly.
5. Keep conversational replies concise, structured, and helpful.`;
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

function summarizeToolCalls(calls: ToolCall[]): string {
  const lines: string[] = [];
  for (const tc of calls) {
    if (tc.name === 'addResume' && tc.result?.status === 'success') {
      lines.push(`Updated chat resume with ${tc.result.resume.sections.length} sections.`);
    } else if (tc.name === 'updateSection' && tc.result?.status === 'success') {
      lines.push(`Updated section "${tc.result.section.title}".`);
    } else if (tc.name === 'addSection' && tc.result?.status === 'success') {
      lines.push(`Added section "${tc.result.section.title}".`);
    } else if (tc.name === 'replaceSections' && tc.result?.status === 'success') {
      lines.push(`Replaced sections (${tc.result.resume.sections.length} sections total).`);
    } else if (tc.name === 'deleteSection' && tc.result?.status === 'success') {
      lines.push(tc.result.message);
    }
  }
  return lines.length > 0 ? lines.join(' ') : 'Done.';
}

export async function runAgentChat(
  messages: ChatMessage[],
  resumes: Resume[],
  model?: string,
  onStream?: (chunk: string) => void,
  thinkingLevel?: string
): Promise<{ content: string; resumes: Resume[]; toolCalls: ToolCall[] }> {
  const ai = getGeminiClient();
  const currentResume = resumes.length > 0 ? resumes[0] : undefined;
  const systemInstruction = buildSystemInstruction(currentResume);
  const contents = mapMessagesToContents(messages);

  const modelName = model || process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3.1-flash-lite";

  let workingResumes = resumes.length > 0 ? [...resumes] : [];
  const toolCallsExecuted: ToolCall[] = [];
  let loopCount = 0;
  let finalModelResponse = "";

  while (loopCount < 5) {
    const config: any = {
      systemInstruction,
      tools: [{ functionDeclarations: ALL_TOOLS }],
    };

    if (thinkingLevel && ThinkingLevel[thinkingLevel.toUpperCase() as keyof typeof ThinkingLevel]) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel[thinkingLevel.toUpperCase() as keyof typeof ThinkingLevel] };
    }

    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents,
      config,
    });

    const textChunks: string[] = [];
    let aggregatedFunctionCalls: any[] | null = null;
    let aggregatedCandidateContent: any = null;

    for await (const chunk of stream) {
      const hasFunctionCalls = chunk.functionCalls && chunk.functionCalls.length > 0;
      if (hasFunctionCalls) {
        aggregatedFunctionCalls = chunk.functionCalls;
      } else if (chunk.text) {
        textChunks.push(chunk.text);
        onStream?.(chunk.text);
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

        // If tool call is addResume or replaceSections, enforce modifying the single chat resume
        if (call.name === 'addResume' && workingResumes.length > 0) {
          call.args.resumeId = workingResumes[0].id;
        }

        const { result, updatedResumes, updated } = executeTool(call.name, call.args, workingResumes);
        if (updated) {
          // Guarantee single resume in array
          if (call.name === 'addResume') {
            const newest = updatedResumes[updatedResumes.length - 1];
            workingResumes = [{
              ...newest,
              id: currentResume?.id || newest.id,
              slug: currentResume?.slug || newest.slug,
            }];
          } else {
            workingResumes = updatedResumes.slice(0, 1);
          }
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
      break;
    }
  }

  if (!finalModelResponse && toolCallsExecuted.length > 0) {
    finalModelResponse = summarizeToolCalls(toolCallsExecuted);
    onStream?.(finalModelResponse);
  }

  return {
    content: finalModelResponse,
    resumes: workingResumes,
    toolCalls: toolCallsExecuted
  };
}

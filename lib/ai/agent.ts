import { getGeminiClient } from "./client";
import { ALL_TOOLS, executeTool } from "./tools";
import { Resume, ChatMessage, ToolCall } from "../schemas";
import { ThinkingLevel } from "@google/genai";

function buildSystemInstruction(resumes: Resume[]): string {
  const resumesJson = JSON.stringify(resumes.map(r => ({
    id: r.id,
    title: r.title,
    sections: r.sections.map(s => ({
      id: s.id,
      type: s.type,
      title: s.title,
      content: s.content,
      order: s.order,
    }))
  })));

  return `You are ResumeFlow, a precise and professional AI resume tailoring expert.
Your job is to help users parse, organize, and polish their resumes section by section.

The user's current resumes and their sections are:
${resumesJson}

Key directives:
1. When a user pastes raw resume text, call 'addResume' with the title, the full raw text, and an array of parsed sections. Identify standard sections (Professional Summary, Experience, Education, Skills, Projects, Certifications, Languages) and extract each one with its full content.
2. When a user asks to rewrite or improve a specific section, call 'updateSection' with the resumeId and sectionId. ONLY update the requested section — never touch other sections.
3. Use 'addSection' to append new sections the user wants to add.
4. Use 'deleteSection' to remove sections the user wants to remove.
5. Always use the actual tools to make changes. Do not pretend — call the correct function tool.
6. Be encouraging, editorial, and focused on making the resume more impactful and ATS-friendly. Keep your conversational replies brief and actionable.`;
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
      lines.push(`Created resume "${tc.result.resume.title}" with ${tc.result.resume.sections.length} sections.`);
    } else if (tc.name === 'updateSection' && tc.result?.status === 'success') {
      lines.push(`Updated section "${tc.result.section.title}".`);
    } else if (tc.name === 'addSection' && tc.result?.status === 'success') {
      lines.push(`Added section "${tc.result.section.title}".`);
    } else if (tc.name === 'deleteSection' && tc.result?.status === 'success') {
      lines.push(tc.result.message);
    } else if (tc.name === 'getResume') {
      lines.push('Retrieved the resume data.');
    } else if (tc.name === 'renameResume' && tc.result?.status === 'success') {
      lines.push(`Renamed resume to "${tc.result.resume.title}".`);
    } else if (tc.name === 'duplicateResume' && tc.result?.status === 'success') {
      lines.push(`Duplicated resume as "${tc.result.resume.title}".`);
    } else if (tc.name === 'reorderSections' && tc.result?.status === 'success') {
      lines.push('Reordered resume sections.');
    } else if (tc.name === 'deleteResume' && tc.result?.status === 'success') {
      lines.push(`Deleted resume "${tc.result.title}".`);
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
  const systemInstruction = buildSystemInstruction(resumes);
  const contents = mapMessagesToContents(messages);

  const modelName = model || process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3.1-flash-lite";

  let currentResumes = [...resumes];
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

        const { result, updatedResumes, updated } = executeTool(call.name, call.args, currentResumes);
        if (updated) {
          currentResumes = updatedResumes;
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
    resumes: currentResumes,
    toolCalls: toolCallsExecuted
  };
}

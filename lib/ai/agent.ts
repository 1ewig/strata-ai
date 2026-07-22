import { getGeminiClient } from "./client";
import { ALL_TOOLS, executeTool } from "./tools";
import { Resume, ChatMessage, ToolCall } from "../schemas";
import { ThinkingLevel } from "@google/genai";

function buildSystemInstruction(resume?: Resume): string {
  const currentMarkdown = resume?.markdownContent
    ? resume.markdownContent
    : "No resume created yet.";

  return `You are ResumeFlow, an expert AI resume editor and career strategist.
Your primary task is to generate and maintain a clean, high-impact, professional Markdown resume for this chat session.

Current Markdown Resume:
\`\`\`markdown
${currentMarkdown}
\`\`\`

MANDATORY RULES & WORKFLOW:
1. Whenever the user provides resume text, requests a resume creation, asks to tailor/rewrite/edit the resume, or wants to add/modify bullet points:
   ALWAYS call the 'setResumeMarkdown' tool with the complete, beautifully formatted markdown content.

2. MARKDOWN FORMATTING BEST PRACTICES:
   - Use # for Candidate Name (Header 1)
   - Use contact line directly under name (Email | Phone | Location | LinkedIn | Portfolio)
   - Use ## for Section Titles (e.g. ## Professional Summary, ## Work Experience, ## Skills, ## Education, ## Projects)
   - Use bold **Job Titles** and **Company Names**, with dates aligned right or italicized.
   - Use bullet points (*) for high-impact accomplishments, metrics, and technical skills.

EXAMPLE MARKDOWN RESUME OUTPUT FOR 'setResumeMarkdown':
\`\`\`markdown
# Jane Doe
jane.doe@example.com | (555) 019-2831 | San Francisco, CA | linkedin.com/in/janedoe | github.com/janedoe

## Professional Summary
Results-driven Senior Full Stack Engineer with 6+ years of experience architecting scalable web applications, real-time AI systems, and microservices. Expert in TypeScript, React, Next.js, and Node.js.

## Technical Skills
* **Languages**: TypeScript, JavaScript, Python, SQL, HTML5, CSS3
* **Frontend**: React, Next.js, Tailwind CSS, Redux Toolkit, Framer Motion
* **Backend**: Node.js, Express, PostgreSQL, Redis, GraphQL, REST APIs
* **Cloud & DevOps**: AWS (S3, EC2, Lambda), Docker, CI/CD pipelines, Vercel

## Professional Experience
### **Senior Frontend Engineer** | TechCorp Inc.
*Jan 2023 – Present | San Francisco, CA*
* Spearheaded the migration of legacy frontend apps to Next.js 15, reducing initial load times by 42%.
* Integrated Gemini LLM APIs and real-time streaming tools, boosting user interaction efficiency by 35%.
* Mentored a team of 5 junior developers and established automated testing pipelines.

### **Software Engineer** | WebCraft Labs
*Jun 2020 – Dec 2022 | San Jose, CA*
* Built interactive dashboards serving 100k+ active daily users using React and WebSockets.
* Optimized database queries resulting in a 25% throughput improvement.

## Education
### **B.S. in Computer Science** | University of California, Berkeley
*Graduated May 2020*
\`\`\`

3. In addition to calling 'setResumeMarkdown', explain your edits concisely in your conversational response. Always maintain precision and strong typography.`;
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

        const { result, updatedResumes, updated } = executeTool(call.name, call.args, workingResumes);
        if (updated) {
          workingResumes = updatedResumes;
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
    finalModelResponse = "I've updated your resume markdown. You can view it in the **Resume Drawer**!";
    onStream?.(finalModelResponse);
  }

  return {
    content: finalModelResponse,
    resumes: workingResumes,
    toolCalls: toolCallsExecuted
  };
}

'use client';

import { UIMessage } from 'ai';
import ToolCallCard from './ToolCallCard';

interface ChatBubbleProps {
  message: UIMessage | { id: string; role: string; content?: string; parts?: any[] };
  isStreaming?: boolean;
}

export default function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  let textContent = '';
  if (Array.isArray(message.parts)) {
    textContent = message.parts
      .filter(p => p.type === 'text' && typeof p.text === 'string')
      .map(p => p.text)
      .join('');
  }
  if (!textContent && typeof (message as any).content === 'string') {
    textContent = (message as any).content;
  }

  const toolParts = Array.isArray(message.parts)
    ? message.parts.filter(p => {
        const isTool =
          p.toolName === 'setResumeMarkdown' ||
          p.name === 'setResumeMarkdown' ||
          p.type === 'tool-invocation' ||
          p.type === 'dynamic-tool' ||
          (typeof p.type === 'string' && p.type.startsWith('tool'));
        const isDone =
          p.state === 'result' ||
          p.state === 'output-available' ||
          p.result !== undefined ||
          p.output !== undefined;
        return isTool && isDone;
      })
    : (message as any).toolCalls || [];

  return (
    <div className={`flex items-start gap-3 fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5 ${
          isUser
            ? 'bg-zinc-700 text-white'
            : 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-white'
        }`}
      >
        {isUser ? 'A' : 'R'}
      </div>

      <div className="flex flex-col max-w-[85%] gap-2">
        {textContent && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? 'bg-zinc-800 text-zinc-200 rounded-tr-sm'
                : 'bg-zinc-900 border border-zinc-800/80 text-zinc-300 rounded-tl-sm whitespace-pre-line'
            }`}
          >
            {textContent.split('**').map((part, i) =>
              i % 2 === 1 ? <strong key={i} className="text-zinc-100 font-bold">{part}</strong> : part
            )}
            {isStreaming && (
              <span className="inline-block w-[2px] h-4 bg-emerald-400 ml-0.5 animate-pulse align-text-bottom" />
            )}
          </div>
        )}

        {!isUser && toolParts.length > 0 && !isStreaming && (
          <div className="space-y-2 ml-1">
            {toolParts.map((tc: any, idx: number) => (
              <ToolCallCard key={idx} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

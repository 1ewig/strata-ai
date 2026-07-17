'use client';

import { ChatMessage } from '@/lib/schemas';
import ToolCallCard from './ToolCallCard';

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export default function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
  const isUser = message.role === 'user';

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
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-zinc-800 text-zinc-200 rounded-tr-sm'
              : 'bg-zinc-900 border border-zinc-800/80 text-zinc-300 rounded-tl-sm whitespace-pre-line'
          }`}
        >
          {message.content.split('**').map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="text-zinc-100 font-bold">{part}</strong> : part
          )}
          {isStreaming && (
            <span className="inline-block w-[2px] h-4 bg-emerald-400 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </div>

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && !isStreaming && (
          <div className="space-y-2 ml-1">
            {message.toolCalls.map((tc, idx) => (
              <ToolCallCard key={idx} toolCall={tc} index={idx} messageId={message.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { User, Sparkles } from 'lucide-react';
import { ChatMessage } from '@/lib/schemas';
import ToolCallCard from './ToolCallCard';

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-lg border flex-shrink-0 flex items-center justify-center mt-0.5 ${
          isUser
            ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
            : 'bg-emerald-950/20 border-emerald-500/10 text-emerald-400'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      <div className="flex flex-col max-w-[85%] gap-2">
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'bg-emerald-600 text-white rounded-tr-none font-medium'
              : 'bg-zinc-900 border border-zinc-800/80 text-zinc-300 rounded-tl-none whitespace-pre-line'
          }`}
        >
          {message.content.split('**').map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="text-zinc-100 font-bold">{part}</strong> : part
          )}
        </div>

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
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

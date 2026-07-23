'use client';

import React from 'react';
import { BrainCircuit } from 'lucide-react';
import ChatBubble from '@/components/chat/ChatBubble';

interface ChatPanelProps {
  messages: any[];
  streamingContent: string | null;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage?: (text: string) => void;
  onOpenResumeDrawer?: () => void;
}

export default function ChatPanel({
  messages,
  streamingContent,
  isLoading,
  messagesEndRef,
  onOpenResumeDrawer,
}: ChatPanelProps) {
  return (
    <div id="chat-messages-scroll" className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && streamingContent === null && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-cyan-400 border border-emerald-500/30 flex items-center justify-center text-zinc-950 font-semibold text-lg shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <BrainCircuit className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">ResumeFlow AI</h3>
          <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
            Ask me to generate, tailor, or format your resume. Paste your career history or job description to get started!
          </p>
        </div>
      )}

      {messages.map((message, idx) => {
        const isLastAssistant = isLoading && message.role === 'assistant' && idx === messages.length - 1;
        return (
          <ChatBubble
            key={message.id}
            message={message}
            isStreaming={isLastAssistant}
            onOpenResumeDrawer={onOpenResumeDrawer}
          />
        );
      })}

      {isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
        <div className="flex items-start gap-3.5 fade-in">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-cyan-400 flex items-center justify-center text-zinc-950 shrink-0 mt-0.5 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <BrainCircuit className="w-4.5 h-4.5 stroke-[2.5]" />
          </div>
          <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-zinc-900/90 border border-zinc-800/80 flex items-center gap-1.5 backdrop-blur-sm">
            <span className="typing-dot w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
            <span className="typing-dot w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="typing-dot w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}


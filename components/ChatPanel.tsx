'use client';

import React from 'react';
import { ChatMessage } from '@/lib/schemas';
import ChatBubble from '@/components/chat/ChatBubble';

interface ChatPanelProps {
  messages: ChatMessage[];
  streamingContent: string | null;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (text: string) => void;
}

export default function ChatPanel({ messages, streamingContent, isLoading, messagesEndRef }: ChatPanelProps) {
  return (
    <div id="chat-messages-scroll" className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && streamingContent === null && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 font-semibold text-lg shadow-lg">
            R
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">Resume Builder AI</h3>
          <p className="text-xs text-zinc-500 max-w-sm">
            Ask me to generate, tailor, or format your resume. Paste your experience or target job description to get started!
          </p>
        </div>
      )}

      {messages.map((message) => (
        <ChatBubble key={message.id} message={message} />
      ))}

      {streamingContent !== null && (
        <ChatBubble
          message={{
            id: 'streaming',
            role: 'model',
            content: streamingContent,
            timestamp: '',
          }}
          isStreaming
        />
      )}

      {isLoading && streamingContent === null && (
        <div className="flex items-start gap-3 fade-in">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-semibold text-white shrink-0 mt-0.5">
            R
          </div>
          <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-zinc-900 border border-zinc-800/80 flex items-center gap-1">
            <span className="typing-dot w-1.5 h-1.5 bg-zinc-400 rounded-full" />
            <span className="typing-dot w-1.5 h-1.5 bg-zinc-400 rounded-full" />
            <span className="typing-dot w-1.5 h-1.5 bg-zinc-400 rounded-full" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}


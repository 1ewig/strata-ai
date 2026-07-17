'use client';

import React from 'react';
import { ChatMessage } from '@/lib/schemas';
import ChatBubble from '@/components/chat/ChatBubble';
import SuggestionChips from '@/components/chat/SuggestionChips';

const QUICK_SUGGESTIONS = [
  { label: "Rewrite my summary section", text: "Help me rewrite my professional summary to be more impactful." },
  { label: "Make my experience ATS-friendly", text: "Review my experience section and suggest ATS-optimized bullet points." },
  { label: "Add a skills section", text: "Create a skills section based on my experience." },
  { label: "Tailor for a specific job", text: "Help me tailor my resume for a Senior Software Engineer role." },
];

interface ChatPanelProps {
  messages: ChatMessage[];
  streamingContent: string | null;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (text: string) => void;
}

export default function ChatPanel({ messages, streamingContent, isLoading, messagesEndRef, onSendMessage }: ChatPanelProps) {
  return (
    <>
      <div id="chat-messages-scroll" className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4">
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

      {messages.length <= 1 && streamingContent === null && (
        <div className="flex-shrink-0 pb-4">
          <SuggestionChips suggestions={QUICK_SUGGESTIONS} onSelect={onSendMessage} />
        </div>
      )}
    </>
  );
}

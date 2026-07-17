'use client';

import React from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export default function ChatInput({ inputValue, onInputChange, onSubmit, isLoading }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900/30 relative z-10">
      <div className="flex gap-2 bg-zinc-950 border border-zinc-800 focus-within:border-emerald-500/50 rounded-xl px-3.5 py-1.5 items-center transition-all">
        <input
          id="chat-input-field"
          type="text"
          disabled={isLoading}
          placeholder="Ask TaskFlow to break down a project..."
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          className="flex-grow bg-transparent text-zinc-200 placeholder-zinc-600 border-none text-sm focus:outline-none py-1.5 focus:ring-0 disabled:opacity-50"
        />
        <button
          id="chat-submit-btn"
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="text-emerald-500 hover:text-emerald-400 disabled:text-zinc-600 transition-colors p-1.5 focus:outline-none"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

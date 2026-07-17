'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export default function ChatInput({ inputValue, onInputChange, onSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isLoading) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative z-10">
      <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-700/50 focus-within:border-zinc-500 rounded-2xl px-3 py-2 transition-all">
        <textarea
          ref={textareaRef}
          id="chat-input-field"
          rows={1}
          disabled={isLoading}
          placeholder="Message ResumeFlow..."
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-zinc-200 placeholder-zinc-500 border-none text-sm focus:outline-none resize-none max-h-40 py-1 focus:ring-0 disabled:opacity-50"
        />
        <button
          id="chat-submit-btn"
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="p-2 rounded-lg bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:opacity-40 shrink-0 transition-colors focus:outline-none"
        >
          <ArrowUp className="w-4 h-4 text-zinc-900" />
        </button>
      </div>
      <p className="text-center text-xs text-zinc-600 mt-2">ResumeFlow can make mistakes. Verify important info.</p>
    </form>
  );
}

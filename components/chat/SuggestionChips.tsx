'use client';

import { Lightbulb, Zap } from 'lucide-react';

interface Suggestion {
  label: string;
  text: string;
}

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSelect: (text: string) => void;
}

export default function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  return (
    <div id="chat-suggestions-container" className="px-4 py-2 border-t border-zinc-800/50 bg-zinc-950/50 relative z-10">
      <p id="chat-suggestions-title" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
        <Lightbulb className="w-3 h-3 text-yellow-500" /> Suggested Prompts
      </p>
      <div id="chat-suggestions-list" className="flex flex-wrap gap-2">
        {suggestions.map((sug, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(sug.text)}
            className="text-xs text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-xl transition-all font-medium text-left focus:outline-none flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            {sug.label}
          </button>
        ))}
      </div>
    </div>
  );
}

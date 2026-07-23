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
    <div id="chat-suggestions-container" className="px-4 py-2 border-t border-edge-raised/50 bg-surface-base/50 relative z-10">
      <p id="chat-suggestions-title" className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
        <Lightbulb className="w-3 h-3 text-yellow-500" /> Suggested Prompts
      </p>
      <div id="chat-suggestions-list" className="flex flex-wrap gap-2">
        {suggestions.map((sug, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(sug.text)}
            className="text-xs text-text-muted hover:text-text-primary bg-surface-raised hover:bg-surface-elevated border border-edge-raised px-3 py-1.5 rounded-xl transition-all font-medium text-left focus:outline-none flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            {sug.label}
          </button>
        ))}
      </div>
    </div>
  );
}

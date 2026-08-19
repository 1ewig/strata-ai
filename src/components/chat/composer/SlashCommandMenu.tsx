'use client';

import React from 'react';
import { Minimize2 } from 'lucide-react';

/** Available slash command definition. */
export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Registry of supported slash commands. */
export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'compact',
    name: '/compact',
    description: 'Condense conversation history to optimize context window',
    icon: Minimize2,
  },
];

/** Props for the SlashCommandMenu popup. */
export interface SlashCommandMenuProps {
  isOpen: boolean;
  commands: SlashCommand[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onExecute: (command: SlashCommand) => void;
}

/**
 * Floating popover menu that lists available slash commands matching the user's input.
 */
function SlashCommandMenu({
  isOpen,
  commands,
  selectedIndex,
  onSelectIndex,
  onExecute,
}: SlashCommandMenuProps) {
  if (!isOpen || commands.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-full max-w-sm sm:max-w-md bg-surface-raised/95 dark:bg-surface-elevated/95 border border-edge-raised rounded-2xl shadow-card backdrop-blur-xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="text-micro font-semibold uppercase tracking-wider text-text-muted px-2.5 py-1.5">
        Commands
      </div>
      <div className="flex flex-col gap-0.5">
        {commands.map((cmd, idx) => {
          const Icon = cmd.icon;
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={cmd.id}
              type="button"
              onMouseEnter={() => onSelectIndex(idx)}
              onClick={() => onExecute(cmd)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left w-full transition-all duration-150 active:scale-[0.99] cursor-pointer ${
                isSelected
                  ? 'bg-primary-soft text-primary'
                  : 'hover:bg-surface-hover text-text-primary'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'bg-primary/20 text-primary'
                    : 'bg-surface-raised border border-edge-raised text-text-secondary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-label font-bold leading-tight">{cmd.name}</span>
                <span className="text-caption text-text-secondary truncate leading-tight">
                  {cmd.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(SlashCommandMenu);

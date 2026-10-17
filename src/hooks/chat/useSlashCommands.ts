'use client';

import { useState, useMemo, useCallback } from 'react';
import { SLASH_COMMANDS, type SlashCommand } from '@/components/chat/input/SlashCommandMenu';

export interface UseSlashCommandsOptions {
  inputValue: string;
  isLoading: boolean;
  isBlocked: boolean;
  onExecute: (command: SlashCommand) => void;
  onClearInput?: () => void;
}

/**
 * Custom hook managing slash command filtering, menu open state,
 * keyboard navigation (arrows/enter/tab/escape), and command execution.
 */
export function useSlashCommands({
  inputValue,
  isLoading,
  isBlocked,
  onExecute,
  onClearInput,
}: UseSlashCommandsOptions) {
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  const isSlashMenuOpen = inputValue.startsWith('/') && !isLoading && !isBlocked;

  const filteredCommands = useMemo(() => {
    const slashFilter = inputValue.toLowerCase().trim();
    return SLASH_COMMANDS.filter((cmd) => cmd.name.toLowerCase().startsWith(slashFilter));
  }, [inputValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isSlashMenuOpen || filteredCommands.length === 0) {
        return false;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev + 1) % filteredCommands.length);
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        onExecute(filteredCommands[selectedCommandIndex]);
        return true;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClearInput?.();
        return true;
      }

      return false;
    },
    [isSlashMenuOpen, filteredCommands, selectedCommandIndex, onExecute, onClearInput]
  );

  return {
    isSlashMenuOpen,
    filteredCommands,
    selectedCommandIndex,
    setSelectedCommandIndex,
    handleKeyDown,
  };
}

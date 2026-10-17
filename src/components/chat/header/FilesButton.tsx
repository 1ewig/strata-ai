'use client';

import React from 'react';
import { Folder } from 'lucide-react';
import { WorkspaceFile } from '@/lib/db/schemas';

/** Props for the FilesButton component. */
export interface FilesButtonProps {
  files?: WorkspaceFile[];
  onOpenDrawer: () => void;
}

/**
 * Workspace files drawer button, visible on all viewports, with a file-count badge.
 */
export default function FilesButton({ files, onOpenDrawer }: FilesButtonProps) {
  return (
    <button
      id="header-files-btn"
      type="button"
      onClick={onOpenDrawer}
      className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-edge-raised hover:border-edge-hover bg-surface-raised/80 hover:bg-surface-hover text-text-primary shadow-button transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 select-none group"
      title={`Open Workspace Files Drawer (${files?.length ?? 0} ${files?.length === 1 ? 'file' : 'files'})`}
      aria-label="Open Workspace Files Drawer"
    >
      <Folder className="w-4 h-4 text-text-muted group-hover:text-primary transition-transform duration-150 group-hover:scale-105" />
      <span className="hidden sm:inline text-caption sm:text-label font-semibold text-text-primary">Files</span>
      {(files?.length ?? 0) > 0 && (
        <span className="hidden sm:inline-flex text-micro px-1.5 py-0.5 rounded-md bg-surface-base border border-edge-default text-primary font-medium shrink-0">
          {files?.length}
        </span>
      )}
    </button>
  );
}

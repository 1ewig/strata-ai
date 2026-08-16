'use client';

import React from 'react';
import { FileText, Code, Plus, Edit3 } from 'lucide-react';

interface WorkspaceEmptyStateProps {
  type: 'no-files' | 'empty-file';
  fileName?: string;
  onCreateFileClick?: () => void;
  onEditFileClick?: () => void;
}

/**
 * Empty state view for either an empty workspace (no files exist)
 * or an active file that currently has no content.
 */
export default React.memo(function WorkspaceEmptyState({
  type,
  fileName,
  onCreateFileClick,
  onEditFileClick,
}: WorkspaceEmptyStateProps) {
  if (type === 'no-files') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <FileText className="w-10 h-10 text-text-faint mb-3" />
        <h4 className="text-text-secondary font-semibold text-subheading">Workspace Drawer Empty</h4>
        <p className="text-body text-text-muted max-w-sm mt-1 mb-4">
          Create a code file or document, or ask the AI to generate files for your workspace.
        </p>
        {onCreateFileClick && (
          <button
            type="button"
            onClick={onCreateFileClick}
            className="group flex items-center gap-2 bg-primary hover:bg-primary-hover active:scale-95 text-surface text-label font-semibold px-4 py-2 rounded-xl shadow-button transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
            <span>Create New File</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <Code className="w-10 h-10 text-text-faint mb-3" />
      <h4 className="text-text-secondary font-semibold text-subheading">{fileName || 'File'} is Empty</h4>
      <p className="text-body text-text-muted max-w-sm mt-1 mb-4">
        Click Edit to add content or prompt the AI assistant.
      </p>
      {onEditFileClick && (
        <button
          type="button"
          onClick={onEditFileClick}
          className="group flex items-center gap-1.5 text-label font-semibold text-primary border border-primary/30 bg-primary-soft hover:bg-primary-soft-strong active:scale-95 px-3.5 py-1.5 rounded-xl shadow-button transition-all duration-150 cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 transition-transform duration-150 group-hover:scale-110" />
          <span>Edit File</span>
        </button>
      )}
    </div>
  );
});

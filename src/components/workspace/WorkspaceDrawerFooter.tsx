'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';
import { MAX_FILE_CHARS } from '@/lib/limits';
import { getLanguageLabel } from '@/lib/languages';

interface WorkspaceDrawerFooterProps {
  activeFile: WorkspaceFile | null;
  isEditing: boolean;
  isFileOverLimit: boolean;
  onClose: () => void;
  onCancelEditing: () => void;
  onSaveEdit: () => void;
}

/**
 * Footer bar for the Workspace Drawer containing metadata,
 * edit/save/cancel controls, and the drawer Close button.
 */
export default React.memo(function WorkspaceDrawerFooter({
  activeFile,
  isEditing,
  isFileOverLimit,
  onClose,
  onCancelEditing,
  onSaveEdit,
}: WorkspaceDrawerFooterProps) {
  const languageLabel = activeFile ? getLanguageLabel(activeFile.name || activeFile.language) : '';

  return (
    <div className="h-16 px-4 sm:px-6 border-t border-edge-raised flex items-center justify-between bg-surface-base/60 backdrop-blur-md shrink-0 gap-3">
      {/* Left: Metadata */}
      <div className="flex items-center gap-2 min-w-0">
        {!isEditing && activeFile ? (
          <span className="text-caption text-text-muted font-medium truncate flex items-center gap-1.5">
            <span>
              {activeFile.content ? `${activeFile.content.length.toLocaleString()} chars` : 'Empty'}
            </span>
            <span>·</span>
            <span className="font-mono text-text-secondary">{languageLabel}</span>
          </span>
        ) : !isEditing ? (
          <span className="text-caption text-text-muted font-medium">No file selected</span>
        ) : null}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onCancelEditing}
              className="text-label text-text-muted hover:text-text-primary active:scale-95 px-3 py-1.5 rounded-xl transition-all duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={isFileOverLimit}
              className={`flex items-center gap-1.5 text-label font-semibold rounded-xl shadow-button transition-all duration-150 shrink-0 ${
                isFileOverLimit
                  ? 'bg-surface-elevated text-text-muted opacity-40 cursor-not-allowed border border-edge-raised shadow-none'
                  : 'text-surface bg-primary hover:bg-primary-hover active:scale-95 cursor-pointer'
              } px-4 py-1.5`}
              title={
                isFileOverLimit
                  ? `File content exceeds ${MAX_FILE_CHARS.toLocaleString()} characters`
                  : 'Save changes'
              }
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-label font-medium text-text-muted hover:text-text-primary bg-surface-elevated hover:bg-surface-hover border border-edge-raised hover:border-edge-hover active:scale-95 px-3.5 py-1.5 rounded-xl shadow-button transition-all duration-150 cursor-pointer"
            title="Close drawer"
          >
            <span>Close</span>
          </button>
        )}
      </div>
    </div>
  );
});

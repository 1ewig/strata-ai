'use client';

import React from 'react';
import { Copy, Check, Edit3 } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';
import { MAX_FILE_CHARS, formatCharCount } from '@/lib/limits';
import { getLanguageLabel } from '@/lib/languages';

interface WorkspaceDrawerFooterProps {
  activeFile: WorkspaceFile;
  isEditing: boolean;
  contentValue: string;
  isFileOverLimit: boolean;
  isFileWarning: boolean;
  copied: boolean;
  onCopy: () => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveEdit: () => void;
}

/**
 * Footer bar for the Workspace Drawer containing character count metrics,
 * copy actions, and edit/save/cancel controls.
 */
export default React.memo(function WorkspaceDrawerFooter({
  activeFile,
  isEditing,
  contentValue,
  isFileOverLimit,
  isFileWarning,
  copied,
  onCopy,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
}: WorkspaceDrawerFooterProps) {
  const languageLabel = getLanguageLabel(activeFile.name || activeFile.language);

  return (
    <div className="h-16 px-4 sm:px-6 border-t border-edge-raised flex items-center justify-between bg-surface-base/60 backdrop-blur-md shrink-0 gap-3">
      {/* Left: Metadata & Character Counter */}
      <div className="flex items-center gap-2 min-w-0">
        {isEditing ? (
          <span
            className={`text-caption font-mono px-2 py-0.5 rounded border transition-colors ${
              isFileOverLimit
                ? 'text-danger bg-danger-soft/30 border-danger/40 font-semibold'
                : isFileWarning
                ? 'text-warning bg-warning-soft/20 border-warning/30'
                : 'text-text-muted bg-surface-elevated border-edge-raised'
            }`}
          >
            {formatCharCount(contentValue.length, MAX_FILE_CHARS)} chars
          </span>
        ) : (
          <span className="text-caption text-text-muted font-medium truncate flex items-center gap-1.5">
            <span>
              {activeFile.content ? `${activeFile.content.length.toLocaleString()} chars` : 'Empty'}
            </span>
            <span>·</span>
            <span className="font-mono text-text-secondary">{languageLabel}</span>
          </span>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {activeFile.content && !isEditing && (
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 text-label font-medium text-text-muted hover:text-text-primary bg-surface-elevated hover:bg-surface-hover border border-edge-raised active:scale-95 px-3 py-1.5 rounded-xl shadow-button transition-all duration-150 cursor-pointer"
            title="Copy file content"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-primary animate-in zoom-in-75 duration-100" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}

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
            onClick={onStartEditing}
            className="flex items-center gap-1.5 text-label font-semibold text-text-bright bg-surface-elevated hover:bg-surface-hover border border-edge-raised hover:border-edge-hover active:scale-95 px-3.5 py-1.5 rounded-xl transition-all duration-150 cursor-pointer shadow-button"
          >
            <Edit3 className="w-3.5 h-3.5 text-primary" />
            <span>Edit File</span>
          </button>
        )}
      </div>
    </div>
  );
});

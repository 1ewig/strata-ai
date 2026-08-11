'use client';

import React from 'react';
import { MAX_FILE_CHARS } from '@/lib/limits';

interface WorkspaceEditorProps {
  fileName: string;
  contentValue: string;
  onFileNameChange: (name: string) => void;
  onContentChange: (content: string) => void;
}

/**
 * Inline text editor for workspace files, containing the file name input
 * and full-length content textarea.
 */
export default React.memo(function WorkspaceEditor({
  fileName,
  contentValue,
  onFileNameChange,
  onContentChange,
}: WorkspaceEditorProps) {
  return (
    <div className="flex flex-col h-full space-y-3">
      <input
        type="text"
        value={fileName}
        onChange={(e) => onFileNameChange(e.target.value)}
        placeholder="File name (e.g. app.ts, index.html, document.md)"
        className="bg-surface-base border border-edge-raised rounded-lg px-3 py-2 text-label font-semibold text-text-bright focus:outline-none focus:border-primary"
      />
      <textarea
        value={contentValue}
        onChange={(e) => onContentChange(e.target.value)}
        maxLength={MAX_FILE_CHARS}
        rows={26}
        placeholder="Type your code, markdown, or text content here..."
        className="w-full flex-1 min-h-[450px] bg-surface-base border border-edge-raised rounded-xl p-4 text-label text-text-primary font-mono focus:outline-none focus:border-primary/60 leading-relaxed resize-y"
      />
    </div>
  );
});

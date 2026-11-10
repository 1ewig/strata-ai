'use client';

import React from 'react';
import CodeMirrorEditor from './CodeMirrorEditor';

interface WorkspaceEditorProps {
  fileName: string;
  contentValue: string;
  onFileNameChange: (name: string) => void;
  onContentChange: (content: string) => void;
}

/**
 * Inline editor for workspace files: the file name input plus a
 * syntax-highlighted CodeMirror surface that mirrors the read-only viewer.
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
      <div className="w-full flex-1 min-h-[450px] bg-surface-base border border-edge-raised rounded-xl overflow-hidden transition-colors focus-within:border-primary/60">
        <CodeMirrorEditor value={contentValue} fileName={fileName} onChange={onContentChange} />
      </div>
    </div>
  );
});

'use client';

import dynamic from 'next/dynamic';

const CodeMirrorSurface = dynamic(() => import('./CodeMirrorSurface'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[450px] w-full p-4 space-y-2.5" aria-hidden="true">
      {[72, 86, 58, 91, 44].map((widthPercent) => (
        <div
          key={widthPercent}
          className="h-3 rounded bg-surface-hover/40 animate-pulse"
          style={{ width: `${widthPercent}%` }}
        />
      ))}
    </div>
  ),
});

export interface CodeMirrorEditorProps {
  value: string;
  fileName: string;
  onChange: (value: string) => void;
}

/**
 * Client-only entry point for the workspace editor. Keeps the CodeMirror
 * dependency out of the server bundle and out of the drawer's initial JS.
 */
export default function CodeMirrorEditor(props: CodeMirrorEditorProps) {
  return <CodeMirrorSurface {...props} />;
}

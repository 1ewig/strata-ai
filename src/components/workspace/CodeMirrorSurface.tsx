'use client';

import React from 'react';
import { useCodeMirror } from '@/hooks/workspace/useCodeMirror';
import { MAX_FILE_CHARS } from '@/lib/limits';

export interface CodeMirrorSurfaceProps {
  value: string;
  fileName: string;
  onChange: (value: string) => void;
}

/**
 * CodeMirror editing surface for a workspace file. Presentational: all editor
 * lifecycle lives in `useCodeMirror`. Loaded on demand by `CodeMirrorEditor`
 * so the editor bundle never ships with the initial drawer payload.
 */
export default function CodeMirrorSurface({ value, fileName, onChange }: CodeMirrorSurfaceProps) {
  const { hostRef } = useCodeMirror({
    value,
    fileName,
    onChange,
    maxChars: MAX_FILE_CHARS,
  });

  return <div ref={hostRef} className="min-h-[450px] w-full text-label" />;
}

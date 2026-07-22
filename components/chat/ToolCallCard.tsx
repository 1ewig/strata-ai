'use client';

import { Terminal } from 'lucide-react';

function formatToolName(name?: string): string {
  switch (name) {
    case 'setResumeMarkdown': return 'Updating Resume Markdown';
    default: return name || 'Tool Execution';
  }
}

interface ToolCallCardProps {
  toolCall: {
    toolName?: string;
    name?: string;
    args?: any;
    input?: any;
    result?: any;
    output?: any;
  };
}

export default function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const name = toolCall.toolName || toolCall.name || 'setResumeMarkdown';
  const args = toolCall.args || toolCall.input;
  const result = toolCall.result || toolCall.output;

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 text-xs font-mono text-zinc-400">
      <div className="flex items-center gap-1.5 text-emerald-400/90 font-semibold mb-2">
        <Terminal className="w-3.5 h-3.5 text-emerald-500" />
        <span>Tool Execution: {formatToolName(name)}</span>
      </div>
      {args && (
        <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/40 text-[11px] mb-1.5 max-h-24 overflow-y-auto">
          <span className="text-zinc-500">Args:</span> {JSON.stringify(args)}
        </div>
      )}
      {result && (
        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
          <span className="text-emerald-500 font-medium">Result:</span>
          <span className="truncate">{result.message || JSON.stringify(result)}</span>
        </div>
      )}
    </div>
  );
}

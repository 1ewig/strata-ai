'use client';

import { Terminal } from 'lucide-react';

function formatToolName(name: string): string {
  switch (name) {
    case 'addTask': return 'Creating task breakdown';
    case 'addStep': return 'Adding detailed step';
    case 'updateTask': return 'Updating task details';
    case 'updateStep': return 'Updating step checkbox/title';
    case 'deleteTask': return 'Removing task completely';
    case 'deleteStep': return 'Deleting specific step';
    case 'listTasks': return 'Retrieving tasks list';
    default: return name;
  }
}

interface ToolCallCardProps {
  toolCall: {
    name: string;
    args: any;
    result?: any;
  };
  index: number;
  messageId: string;
}

export default function ToolCallCard({ toolCall, index, messageId }: ToolCallCardProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 text-xs font-mono text-zinc-400">
      <div className="flex items-center gap-1.5 text-emerald-400/90 font-semibold mb-2">
        <Terminal className="w-3.5 h-3.5 text-emerald-500" />
        <span>Tool Execution: {formatToolName(toolCall.name)}</span>
      </div>
      <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/40 text-[11px] mb-1.5 max-h-24 overflow-y-auto">
        <span className="text-zinc-500">Args:</span> {JSON.stringify(toolCall.args)}
      </div>
      {toolCall.result && (
        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
          <span className="text-emerald-500 font-medium">Result:</span>
          <span className="truncate">{toolCall.result.message || JSON.stringify(toolCall.result)}</span>
        </div>
      )}
    </div>
  );
}

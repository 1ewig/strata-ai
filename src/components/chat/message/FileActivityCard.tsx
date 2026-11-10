'use client';

import React from 'react';
import { FileText, ArrowUpRight } from 'lucide-react';
import type { FileActivity } from '@/agent/client/file-activity';
import { getLanguageLabel } from '@/lib/code/languages';

export interface FileActivityCardProps {
  activity: FileActivity[];
  onOpenFile?: (fileId: string) => void;
}

const ACTION_LABEL: Record<'created' | 'replaced' | 'edited', string> = {
  created: 'Created',
  replaced: 'Edited',
  edited: 'Edited',
};

/**
 * Claude-style file activity rows rendered between the assistant response and
 * its action bar: one full-width card per workspace file the turn created or
 * edited (renames and deletions are deliberately not shown). The whole row
 * opens the workspace drawer on that file; the Open pill on the right is a
 * visual affordance (a span, since the row itself is the button).
 */
function FileActivityCard({ activity, onOpenFile }: FileActivityCardProps) {
  const openable = (activity || []).filter(
    (item): item is FileActivity & {
      fileId: string;
      action: 'created' | 'replaced' | 'edited';
    } =>
      (item.action === 'created' ||
        item.action === 'replaced' ||
        item.action === 'edited') &&
      Boolean(item.fileId),
  );
  if (openable.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-1.5 mt-1">
      {openable.map((item) => (
        <button
          key={item.fileId}
          type="button"
          onClick={() => onOpenFile?.(item.fileId)}
          className="w-full flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl border border-edge-default bg-surface-raised text-left transition-colors group cursor-pointer hover:border-edge-raised hover:bg-surface-hover/40"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-surface-hover/50 border border-edge-default flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-text-secondary" />
          </div>
          <div className="flex flex-col min-w-0 flex-1 gap-0.5">
            <span className="text-label truncate text-text-primary font-medium group-hover:text-text-bright transition-colors">
              {item.name}
            </span>
            <span className="text-micro font-mono text-text-muted truncate">
              {ACTION_LABEL[item.action]} · {getLanguageLabel(item.name)}
            </span>
          </div>
          <span className="shrink-0 hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-hover/70 text-label font-medium text-text-secondary group-hover:bg-surface-hover group-hover:text-text-bright transition-colors">
            Open
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
          <span className="shrink-0 sm:hidden flex items-center justify-center w-7 h-7 rounded-lg bg-surface-hover/70 text-text-secondary group-hover:bg-surface-hover group-hover:text-text-bright transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </button>
      ))}
    </div>
  );
}

export default React.memo(FileActivityCard);

'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import type { FileActivity } from '@/agent/client/file-activity';
import { getLanguageLabel } from '@/lib/code/languages';

export interface FileActivityCardProps {
  activity: FileActivity[];
  onOpenFile?: (fileId: string) => void;
}

const ACTION_META: Record<
  'created' | 'replaced' | 'edited',
  { label: string; badgeClass: string }
> = {
  created: { label: 'Created', badgeClass: 'text-primary' },
  replaced: { label: 'Replaced', badgeClass: 'text-primary' },
  edited: { label: 'Edited', badgeClass: 'text-warning' },
};

function extensionLabel(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1) : '';
  return ext ? ext.toUpperCase() : 'File';
}

/**
 * Claude-style file activity rows rendered between the assistant response and
 * its action bar: one full-width card per workspace file the turn created or
 * edited (renames and deletions are deliberately not shown). Clicking a row
 * opens the workspace drawer on that file.
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
      {openable.map((item) => {
        const meta = ACTION_META[item.action];
        return (
          <button
            key={item.fileId}
            type="button"
            onClick={() => onOpenFile?.(item.fileId)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-edge-default bg-surface-raised text-left transition-colors group cursor-pointer hover:border-edge-raised hover:bg-surface-hover/40"
          >
            <div className="w-9 h-9 rounded-lg bg-surface-hover/50 border border-edge-default flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
              <span className="text-label truncate text-text-primary font-medium group-hover:text-text-bright transition-colors">
                {item.name}
              </span>
              <span className="text-micro font-mono text-text-muted truncate">
                {getLanguageLabel(item.name)} · {extensionLabel(item.name)}
              </span>
            </div>
            <span className={`text-micro font-mono shrink-0 ${meta.badgeClass}`}>
              {meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default React.memo(FileActivityCard);

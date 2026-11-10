'use client';

import React from 'react';
import { FileText, FileX2 } from 'lucide-react';
import type { FileActivity } from '@/agent/client/file-activity';
import { getLanguageLabel } from '@/lib/code/languages';

export interface FileActivityCardProps {
  activity: FileActivity[];
  onOpenFile?: (fileId: string) => void;
}

const ACTION_META: Record<
  FileActivity['action'],
  { label: string; badgeClass: string }
> = {
  created: { label: 'Created', badgeClass: 'text-primary' },
  replaced: { label: 'Replaced', badgeClass: 'text-primary' },
  edited: { label: 'Edited', badgeClass: 'text-warning' },
  renamed: { label: 'Renamed', badgeClass: 'text-info' },
  deleted: { label: 'Deleted', badgeClass: 'text-danger' },
};

function extensionLabel(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1) : '';
  return ext ? ext.toUpperCase() : 'File';
}

/**
 * Claude-style file activity rows rendered between the assistant response and
 * its action bar: one full-width card per workspace file the turn mutated.
 * Clicking a row opens the workspace drawer on that file; deleted files render
 * muted and inert.
 */
function FileActivityCard({ activity, onOpenFile }: FileActivityCardProps) {
  if (!activity || activity.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-1.5 mt-1">
      {activity.map((item) => {
        const meta = ACTION_META[item.action];
        const isDeleted = item.action === 'deleted';
        const clickable = Boolean(item.fileId && onOpenFile) && !isDeleted;
        const Row = clickable ? 'button' : 'div';
        return (
          <Row
            key={item.fileId || item.name}
            {...(clickable
              ? {
                  type: 'button' as const,
                  onClick: () => onOpenFile?.(item.fileId as string),
                }
              : {})}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border border-edge-default bg-surface-raised text-left transition-colors group ${
              clickable
                ? 'cursor-pointer hover:border-edge-raised hover:bg-surface-hover/40'
                : 'opacity-60 cursor-default'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-surface-hover/50 border border-edge-default flex items-center justify-center shrink-0">
              {isDeleted ? (
                <FileX2 className="w-4 h-4 text-text-muted" />
              ) : (
                <FileText className="w-4 h-4 text-text-secondary" />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
              <span
                className={`text-label truncate ${
                  isDeleted
                    ? 'text-text-muted line-through'
                    : 'text-text-primary font-medium group-hover:text-text-bright transition-colors'
                }`}
              >
                {item.name}
              </span>
              <span className="text-micro font-mono text-text-muted truncate">
                {getLanguageLabel(item.name)} · {extensionLabel(item.name)}
              </span>
            </div>
            <span className={`text-micro font-mono shrink-0 ${meta.badgeClass}`}>
              {meta.label}
            </span>
          </Row>
        );
      })}
    </div>
  );
}

export default React.memo(FileActivityCard);

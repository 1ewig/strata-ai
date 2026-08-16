'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText, FileCode2, Plus } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';
import { MAX_FILES_PER_WORKSPACE } from '@/lib/limits';
import { isMarkdownFile, getLanguageMeta } from '@/lib/languages';

interface WorkspaceFileSelectorProps {
  files: WorkspaceFile[];
  activeFile: WorkspaceFile | null;
  onSelectFile: (fileId: string) => void;
  onCreateNewClick: () => void;
}

/**
 * Dropdown selector for switching workspace files, showing active file status,
 * language badges, and the "Create New File" trigger.
 */
export default React.memo(function WorkspaceFileSelector({
  files,
  activeFile,
  onSelectFile,
  onCreateNewClick,
}: WorkspaceFileSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCurrentMarkdown = isMarkdownFile(activeFile?.name, activeFile?.language);
  const isMaxFilesReached = files.length >= MAX_FILES_PER_WORKSPACE;

  return (
    <div className="relative" ref={dropdownRef}>
      {files.length > 0 ? (
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2 bg-transparent border-0 px-1 py-1 text-label font-semibold text-text-bright hover:opacity-80 active:scale-[0.98] transition-all duration-150 cursor-pointer max-w-[200px] sm:max-w-[280px]"
        >
          {isCurrentMarkdown ? (
            <FileText className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <FileCode2 className="w-4 h-4 text-primary shrink-0" />
          )}
          <span className="truncate flex-1 text-left">{activeFile?.name || 'Select File'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180 text-text-primary' : ''
            }`}
          />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 text-label font-semibold text-text-muted px-2 py-1">
          <FileText className="w-4 h-4 text-text-faint" />
          <span>No Files</span>
        </div>
      )}

      {isDropdownOpen && files.length > 0 && (
        <div className="absolute mt-1.5 left-0 w-72 max-w-[calc(100vw-3rem)] bg-surface-elevated border border-edge-hover rounded-xl shadow-card-lg overflow-hidden text-caption z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-edge-raised font-semibold text-text-muted text-micro uppercase tracking-wider flex items-center justify-between">
            <span>Workspace Files</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-base border border-edge-raised font-mono text-micro text-text-secondary font-semibold">
              {files.length}/{MAX_FILES_PER_WORKSPACE} files
            </span>
          </div>

          <div className="py-1 max-h-56 overflow-y-auto">
            {files.map((f) => {
              const isActive = f.id === activeFile?.id;
              const isMd = isMarkdownFile(f.name, f.language);
              const meta = getLanguageMeta(f.name || f.language);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onSelectFile(f.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between active:scale-[0.99] transition-all duration-150 cursor-pointer ${
                    isActive ? 'bg-primary-soft text-primary font-semibold' : 'text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    {isMd ? (
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`}
                      />
                    ) : (
                      <FileCode2
                        className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`}
                      />
                    )}
                    <span className="truncate">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-micro font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface-base border border-edge-raised">
                      {meta.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Plus Button */}
          <div className="p-1 border-t border-edge-raised">
            <button
              type="button"
              onClick={() => {
                if (isMaxFilesReached) return;
                setIsDropdownOpen(false);
                onCreateNewClick();
              }}
              disabled={isMaxFilesReached}
              className={`group w-full flex items-center gap-2 px-3 py-2 rounded-lg text-caption font-semibold transition-all duration-150 cursor-pointer ${
                isMaxFilesReached
                  ? 'opacity-40 cursor-not-allowed text-text-muted'
                  : 'text-primary hover:bg-primary-soft/60 active:scale-[0.98]'
              }`}
              title={
                isMaxFilesReached
                  ? `Maximum ${MAX_FILES_PER_WORKSPACE} files per workspace reached.`
                  : 'Create new file'
              }
            >
              <Plus className="w-3.5 h-3.5 text-primary transition-transform duration-200 group-hover:rotate-90" />
              <span>Create New File</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

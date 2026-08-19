import React, { type ReactNode } from 'react';

/**
 * Reusable summary header component for consistent title and badge formatting across tools.
 */
interface SummaryHeaderProps {
  title: ReactNode;
  badge?: ReactNode;
  badgeColorClass?: string;
}

function SummaryHeader({ title, badge, badgeColorClass = 'text-info' }: SummaryHeaderProps) {
  return (
    <div className="flex items-center justify-between text-caption gap-2">
      <span className="font-medium font-mono text-text-primary truncate">{title}</span>
      {badge && (
        <span className={`text-micro font-mono shrink-0 font-medium ${badgeColorClass}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

/**
 * Reusable in-flight loading summary for running tools.
 */
interface InFlightSummaryProps {
  title: ReactNode;
  badgeText: string;
  loadingText: string;
}

function InFlightSummary({ title, badgeText, loadingText }: InFlightSummaryProps) {
  return (
    <div className="py-1 space-y-1">
      <SummaryHeader
        title={title}
        badge={
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-info animate-ping" />
            {badgeText}
          </span>
        }
      />
      <p className="text-caption text-text-muted animate-pulse">{loadingText}</p>
    </div>
  );
}

/**
 * Summary for listFiles: files found in workspace.
 */
export function buildListFilesSummary(args: any, result: any, status: 'loading' | 'success' | 'error'): ReactNode {
  if (status === 'loading') {
    return (
      <InFlightSummary
        title="Workspace Files"
        badgeText="loading..."
        loadingText="Scanning workspace documents..."
      />
    );
  }

  const filesList: Array<{ name: string }> = result?.files || [];
  return (
    <div className="py-1 space-y-1 font-mono text-caption">
      <div className="text-text-muted font-medium text-caption">Files Found:</div>
      {filesList.length > 0 ? (
        <ul className="space-y-0.5 text-text-secondary pl-2">
          {filesList.map((f, i) => (
            <li key={i} className="truncate">• {f.name}</li>
          ))}
        </ul>
      ) : (
        <p className="text-text-muted italic text-caption">No files in workspace</p>
      )}
    </div>
  );
}

/**
 * Summary for readFile: the file read.
 */
export function buildReadFileSummary(args: any, result: any, status: 'loading' | 'success' | 'error'): ReactNode {
  const fileName = args?.nameOrId || result?.name || 'File';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={fileName}
        badgeText="loading..."
        loadingText="Reading document content..."
      />
    );
  }

  return (
    <div className="py-1 font-mono text-caption flex items-center gap-1.5">
      <span className="text-text-muted text-caption">File Read:</span>
      <span className="text-text-primary font-medium truncate">{fileName}</span>
    </div>
  );
}

/**
 * Summary for writeFile: the file created or updated.
 */
export function buildWriteFileSummary(args: any, result: any, status: 'loading' | 'success' | 'error'): ReactNode {
  const name = args?.name || result?.file?.name || 'File';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={name}
        badgeText="loading..."
        loadingText="Writing file changes to workspace..."
      />
    );
  }

  const isCreated = result?.action === 'created';
  return (
    <div className="py-1 font-mono text-caption flex items-center gap-1.5">
      <span className="text-text-muted text-caption">{isCreated ? 'File Created:' : 'File Updated:'}</span>
      <span className="text-primary font-medium truncate">{name}</span>
    </div>
  );
}

/**
 * Summary for editFile: the file edited.
 */
export function buildEditFileSummary(args: any, result: any, status: 'loading' | 'success' | 'error'): ReactNode {
  const name = args?.nameOrId || result?.file?.name || 'File';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={name}
        badgeText="loading..."
        loadingText="Applying surgical edits to document..."
      />
    );
  }

  return (
    <div className="py-1 font-mono text-caption flex items-center gap-1.5">
      <span className="text-text-muted text-caption">File Edited:</span>
      <span className="text-warning font-medium truncate">{name}</span>
    </div>
  );
}

/**
 * Summary for renameFile: the old name and new name.
 */
export function buildRenameFileSummary(args: any, result: any, status: 'loading' | 'success' | 'error'): ReactNode {
  const oldName = args?.nameOrId || result?.oldName || 'File';
  const newName = result?.newName || args?.newName || '';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={oldName}
        badgeText="loading..."
        loadingText="Renaming file in workspace..."
      />
    );
  }

  return (
    <div className="py-1 font-mono text-caption flex items-center gap-1.5">
      <span className="text-text-muted text-caption">File Renamed:</span>
      <span className="text-text-muted line-through truncate">{oldName}</span>
      <span className="text-text-secondary">→</span>
      <span className="text-text-primary font-medium truncate">{newName}</span>
    </div>
  );
}

/**
 * Summary for deleteFile: the file deleted.
 */
export function buildDeleteFileSummary(args: any, result: any, status: 'loading' | 'success' | 'error'): ReactNode {
  const name = args?.nameOrId || result?.name || 'File';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={name}
        badgeText="loading..."
        loadingText="Deleting file from workspace..."
      />
    );
  }

  return (
    <div className="py-1 font-mono text-caption flex items-center gap-1.5">
      <span className="text-text-muted text-caption">File Removed:</span>
      <span className="text-danger font-medium truncate">{name}</span>
    </div>
  );
}

/**
 * Summary for webSearch: search query and URLs found.
 */
export function buildWebSearchSummary(args: any, result: any, status: 'loading' | 'success' | 'error'): ReactNode {
  const query = args?.query || result?.query || '';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={query ? `"${query}"` : 'Web Search'}
        badgeText="loading..."
        loadingText="Querying Tavily search API and retrieving web sources..."
      />
    );
  }

  const resultsList: Array<{ title?: string; url: string; publishedDate?: string }> = result?.results || [];

  return (
    <div className="py-1 space-y-1.5 font-mono text-caption">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted text-caption">Query:</span>
        <span className="text-text-primary font-medium truncate">&quot;{query}&quot;</span>
      </div>

      {resultsList.length > 0 && (
        <div className="space-y-0.5">
          <span className="text-text-muted text-caption block">URLs Found:</span>
          <ul className="space-y-0.5 text-text-secondary text-caption pl-2">
            {resultsList.map((r, i) => (
              <li key={i} className="truncate flex items-center justify-between gap-2">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-info truncate block"
                >
                  {r.title || r.url}
                </a>
                {r.publishedDate && (
                  <span className="text-micro text-text-faint shrink-0">{r.publishedDate}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.error && (
        <p className="text-caption text-danger truncate">Error: {result.error}</p>
      )}
    </div>
  );
}

/**
 * Summary for extractUrl: target URLs extracted and partial failures.
 */
export function buildExtractUrlSummary(args: any, result: any, status: 'loading' | 'success' | 'error'): ReactNode {
  const urls: string[] = args?.urls || [];
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={urls.length > 0 ? urls.join(', ') : 'URL Extraction'}
        badgeText="loading..."
        loadingText="Parsing clean Markdown content from web pages..."
      />
    );
  }

  const extracted: Array<{ url: string; title?: string }> = result?.extracted || [];
  const failed: Array<{ url: string; error: string }> = result?.failed || [];

  return (
    <div className="py-1 space-y-1.5 font-mono text-caption">
      {extracted.length > 0 && (
        <div className="space-y-0.5">
          <span className="text-text-muted text-caption block">Extracted URLs:</span>
          <ul className="space-y-0.5 text-text-secondary text-caption pl-2">
            {extracted.map((e, i) => (
              <li key={i} className="truncate">
                <a
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-info truncate block"
                >
                  {e.title ? `${e.title} (${e.url})` : e.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {failed.length > 0 && (
        <div className="space-y-0.5">
          <span className="text-danger text-caption block font-medium">Failed URLs:</span>
          <ul className="space-y-0.5 text-danger-soft text-caption pl-2">
            {failed.map((f, i) => (
              <li key={i} className="truncate text-danger">
                • {f.url}: {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {extracted.length === 0 && failed.length === 0 && (
        <p className="text-text-muted italic text-caption">No URLs extracted</p>
      )}

      {result?.error && (
        <p className="text-caption text-danger truncate">Error: {result.error}</p>
      )}
    </div>
  );
}

/**
 * Fallback summary for tools without a dedicated builder
 */
export function buildGenericSummary(args: any, rawName: string): ReactNode {
  return (
    <div className="py-1 text-caption">
      <p className="font-medium text-text-primary truncate">{rawName || 'Tool Execution'}</p>
    </div>
  );
}
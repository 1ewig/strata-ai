import React, { type ReactNode } from 'react';
import { ExternalLink, XCircle } from 'lucide-react';
import { FaviconImage } from '@/components/ui/FaviconImage';
import { extractDomain } from '@/lib/urls';

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
    <div className="flex items-center justify-between text-label gap-2">
      <span className="font-medium font-mono text-text-primary min-w-0 line-clamp-2 wrap-anywhere">{title}</span>
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
      <p className="text-label text-text-muted animate-pulse">{loadingText}</p>
    </div>
  );
}

/**
 * Label-over-value pair used by the tool summaries. Long values (file names,
 * queries, URLs) get the full row width, break anywhere, and clamp to two lines
 * with the complete string in the native tooltip.
 */
interface SummaryLineProps {
  label: string;
  value: ReactNode;
  valueClass?: string;
  /** Full text for the native tooltip; only needed when `value` is a node. */
  title?: string;
  /**
   * `stacked` puts the muted label above the value. `inline` keeps compact
   * scalar stats (counts) on a single line.
   */
  variant?: 'stacked' | 'inline';
}

function SummaryLine({
  label,
  value,
  valueClass = 'text-text-primary font-medium',
  title,
  variant = 'stacked',
}: SummaryLineProps) {
  const labelNode = <span className="text-micro text-text-muted font-medium">{label}</span>;
  const tooltip = title ?? (typeof value === 'string' ? value : undefined);

  if (variant === 'inline') {
    return (
      <div className="py-1 font-mono text-label flex items-baseline gap-1.5 min-w-0">
        {labelNode}
        <span title={tooltip} className={`text-label min-w-0 wrap-anywhere ${valueClass}`}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className="py-1 font-mono flex flex-col gap-0.5 min-w-0">
      {labelNode}
      <div title={tooltip} className={`text-label min-w-0 line-clamp-2 wrap-anywhere ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

// Structural tool payloads for type-safe summary generation
export interface ListFilesResult {
  files?: Array<{ name: string; id?: string }>;
}

export interface FileToolArgs {
  nameOrId?: string;
  name?: string;
  newName?: string;
  section?: string;
  content?: string;
  searchString?: string;
  replacementString?: string;
}

export interface FileToolResult {
  name?: string;
  oldName?: string;
  newName?: string;
  action?: string;
  file?: { name?: string; id?: string };
}

export interface WebSearchArgs {
  query?: string;
  maxResults?: number;
}

export interface WebSearchResult {
  query?: string;
  results?: Array<{ title?: string; url: string; publishedDate?: string; favicon?: string }>;
  error?: string;
}

export interface ExtractUrlArgs {
  urls?: string[];
  url?: string;
}

export interface ExtractUrlResult {
  extracted?: Array<{ url: string; title?: string; favicon?: string }>;
  failed?: Array<{ url: string; error: string }>;
  error?: string;
}

/**
 * Summary for listFiles: files found in workspace.
 */
export function buildListFilesSummary(
  _args: Record<string, unknown> | unknown,
  result: Record<string, unknown> | unknown,
  status: 'loading' | 'success' | 'error',
): ReactNode {
  if (status === 'loading') {
    return (
      <InFlightSummary
        title="Workspace Files"
        badgeText="loading..."
        loadingText="Scanning workspace documents..."
      />
    );
  }

  const res = (result && typeof result === 'object' ? result : {}) as ListFilesResult;
  const filesList = res.files || [];
  return (
    <div className="py-1 space-y-1 font-mono text-label min-w-0">
      <div className="text-micro text-text-muted font-medium">Files Found</div>
      {filesList.length > 0 ? (
        <ul className="space-y-0.5 text-text-secondary pl-2 min-w-0">
          {filesList.map((f, i) => (
            <li key={i} className="line-clamp-2 wrap-anywhere" title={f.name}>
              • {f.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-muted italic text-label">No files in workspace</p>
      )}
    </div>
  );
}

/**
 * Summary for readFile: the file read.
 */
export function buildReadFileSummary(
  args: Record<string, unknown> | unknown,
  result: Record<string, unknown> | unknown,
  status: 'loading' | 'success' | 'error',
): ReactNode {
  const a = (args && typeof args === 'object' ? args : {}) as FileToolArgs;
  const r = (result && typeof result === 'object' ? result : {}) as FileToolResult;
  const fileName = a.nameOrId || r.name || 'File';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={fileName}
        badgeText="loading..."
        loadingText="Reading document content..."
      />
    );
  }

  return <SummaryLine label="File Read" value={fileName} />;
}

/**
 * Summary for writeFile: the file created or updated.
 */
export function buildWriteFileSummary(
  args: Record<string, unknown> | unknown,
  result: Record<string, unknown> | unknown,
  status: 'loading' | 'success' | 'error',
): ReactNode {
  const a = (args && typeof args === 'object' ? args : {}) as FileToolArgs;
  const r = (result && typeof result === 'object' ? result : {}) as FileToolResult;
  const name = a.name || r.file?.name || 'File';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={name}
        badgeText="loading..."
        loadingText="Writing file changes to workspace..."
      />
    );
  }

  const isCreated = r.action === 'created';
  return <SummaryLine label={isCreated ? 'File Created' : 'File Updated'} value={name} valueClass="text-primary font-medium" />;
}

/**
 * Summary for editFile: the file edited.
 */
export function buildEditFileSummary(
  args: Record<string, unknown> | unknown,
  result: Record<string, unknown> | unknown,
  status: 'loading' | 'success' | 'error',
): ReactNode {
  const a = (args && typeof args === 'object' ? args : {}) as FileToolArgs;
  const r = (result && typeof result === 'object' ? result : {}) as FileToolResult;
  const name = a.nameOrId || r.file?.name || 'File';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={name}
        badgeText="loading..."
        loadingText="Applying surgical edits to document..."
      />
    );
  }

  return <SummaryLine label="File Edited" value={name} valueClass="text-warning font-medium" />;
}

/**
 * Summary for renameFile: the old name and new name.
 */
export function buildRenameFileSummary(
  args: Record<string, unknown> | unknown,
  result: Record<string, unknown> | unknown,
  status: 'loading' | 'success' | 'error',
): ReactNode {
  const a = (args && typeof args === 'object' ? args : {}) as FileToolArgs;
  const r = (result && typeof result === 'object' ? result : {}) as FileToolResult;
  const oldName = a.nameOrId || r.oldName || 'File';
  const newName = r.newName || a.newName || '';
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
    <SummaryLine
      label="File Renamed"
      title={`${oldName} → ${newName}`}
      value={
        <>
          <span className="text-text-muted line-through">{oldName}</span>
          <span className="text-text-secondary mx-1">→</span>
          <span className="text-text-primary font-medium">{newName}</span>
        </>
      }
    />
  );
}

/**
 * Summary for deleteFile: the file deleted.
 */
export function buildDeleteFileSummary(
  args: Record<string, unknown> | unknown,
  result: Record<string, unknown> | unknown,
  status: 'loading' | 'success' | 'error',
): ReactNode {
  const a = (args && typeof args === 'object' ? args : {}) as FileToolArgs;
  const r = (result && typeof result === 'object' ? result : {}) as FileToolResult;
  const name = a.nameOrId || r.name || 'File';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={name}
        badgeText="loading..."
        loadingText="Deleting file from workspace..."
      />
    );
  }

  return <SummaryLine label="File Removed" value={name} valueClass="text-danger font-medium" />;
}

/**
 * Summary for webSearch: search query and URLs found.
 */
export function buildWebSearchSummary(
  args: Record<string, unknown> | unknown,
  result: Record<string, unknown> | unknown,
  status: 'loading' | 'success' | 'error',
): ReactNode {
  const a = (args && typeof args === 'object' ? args : {}) as WebSearchArgs;
  const r = (result && typeof result === 'object' ? result : {}) as WebSearchResult;
  const query = a.query || r.query || '';
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={query ? `"${query}"` : 'Web Search'}
        badgeText="loading..."
        loadingText="Querying Tavily search API and retrieving web sources..."
      />
    );
  }

  const resultsList = r.results || [];

  return (
    <div className="py-1 space-y-1 font-mono text-label min-w-0">
      <SummaryLine label="Query" value={`"${query}"`} />
      <SummaryLine
        label="Results"
        value={String(resultsList.length)}
        valueClass="text-info font-medium"
        variant="inline"
      />

      {resultsList.length > 0 && (
        <div className="pt-0.5 space-y-1">
          {resultsList.map((res, i) => (
            <a
              key={i}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 p-1 text-text-primary transition-colors text-label group"
            >
              <FaviconImage url={res.url} faviconUrl={res.favicon} className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="font-sans font-medium group-hover:text-primary transition-colors min-w-0 line-clamp-2 wrap-anywhere">
                {res.title || extractDomain(res.url)}
              </span>
              <span className="text-micro font-mono text-text-muted shrink-0 ml-auto hidden sm:inline">
                {extractDomain(res.url)}
              </span>
              <ExternalLink className="w-3 h-3 text-text-muted group-hover:text-primary shrink-0 opacity-60 group-hover:opacity-100 mt-0.5" />
            </a>
          ))}
        </div>
      )}

      {r.error && (
        <p className="text-label text-danger line-clamp-2 wrap-anywhere" title={r.error}>
          Error: {r.error}
        </p>
      )}
    </div>
  );
}

/**
 * Summary for extractUrl: target URLs extracted and partial failures.
 */
export function buildExtractUrlSummary(
  args: Record<string, unknown> | unknown,
  result: Record<string, unknown> | unknown,
  status: 'loading' | 'success' | 'error',
): ReactNode {
  const a = (args && typeof args === 'object' ? args : {}) as ExtractUrlArgs;
  const r = (result && typeof result === 'object' ? result : {}) as ExtractUrlResult;
  const urls: string[] = a.urls || (a.url ? [a.url] : []);
  if (status === 'loading') {
    return (
      <InFlightSummary
        title={urls.length > 0 ? urls.join(', ') : 'URL Extraction'}
        badgeText="loading..."
        loadingText="Parsing clean Markdown content from web pages..."
      />
    );
  }

  const extracted = r.extracted || [];
  const failed = r.failed || [];

  return (
    <div className="py-1 space-y-1 font-mono text-label min-w-0">
      <SummaryLine
        label="Fetched"
        value={`${extracted.length} page${extracted.length === 1 ? '' : 's'}`}
        valueClass="text-info font-medium"
        variant="inline"
      />
      {failed.length > 0 && (
        <SummaryLine
          label="Failed"
          value={String(failed.length)}
          valueClass="text-danger font-medium"
          variant="inline"
        />
      )}

      {extracted.length > 0 && (
        <div className="pt-0.5 space-y-1">
          {extracted.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 p-1 text-text-primary transition-colors text-label group"
            >
              <FaviconImage url={item.url} faviconUrl={item.favicon} className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="font-sans font-medium group-hover:text-primary transition-colors min-w-0 line-clamp-2 wrap-anywhere">
                {item.title || extractDomain(item.url)}
              </span>
              <span className="text-micro font-mono text-text-muted shrink-0 ml-auto hidden sm:inline">
                {extractDomain(item.url)}
              </span>
              <ExternalLink className="w-3 h-3 text-text-muted group-hover:text-primary shrink-0 opacity-60 group-hover:opacity-100 mt-0.5" />
            </a>
          ))}
        </div>
      )}

      {failed.length > 0 && (
        <div className="pt-0.5 space-y-1">
          {failed.map((f, idx) => (
            <div key={idx} className="flex items-start gap-1.5 p-1 rounded-md text-danger text-label">
              <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="min-w-0 line-clamp-2 wrap-anywhere" title={f.url}>
                {f.url}
              </span>
              <span className="text-micro text-danger/80 ml-auto shrink-0 hidden sm:inline">
                ({f.error})
              </span>
            </div>
          ))}
        </div>
      )}

      {r.error && (
        <p className="text-label text-danger line-clamp-2 wrap-anywhere" title={r.error}>
          Error: {r.error}
        </p>
      )}
    </div>
  );
}

/**
 * Fallback summary for tools without a dedicated builder
 */
export function buildGenericSummary(
  _args: Record<string, unknown> | unknown,
  rawName: string,
): ReactNode {
  return (
    <div className="py-1 text-label min-w-0">
      <p
        className="font-medium text-text-primary line-clamp-2 wrap-anywhere"
        title={rawName || undefined}
      >
        {rawName || 'Tool Execution'}
      </p>
    </div>
  );
}
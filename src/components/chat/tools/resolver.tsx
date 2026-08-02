import React, { type ReactNode } from 'react';
import { type LucideIcon, Sparkles, Search, Trash2, PencilLine, PenLine, Wrench, FileText, Folder, Globe } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';

/**
 * Display-ready props consumed by ToolCallCard, produced by resolveToolDisplay().
 * All visual details (label, icon, accent colors) are resolved here rather than in the card.
 */
export interface ToolCardProps {
  label: string;
  badge: string;
  icon: LucideIcon;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  status: 'loading' | 'success' | 'error';
  summary: ReactNode;
  rawArgs: unknown;
  rawResult: unknown;
  onOpenDrawer?: () => void;
}

/**
 * Visual configuration for one tool: the label, status badge, icon, and accent color classes.
 */
type ToolConfig = {
  label: string;
  badge: string;
  icon: LucideIcon;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
};

/**
 * Per-tool display configs keyed by normalized tool name.
 */
const toolConfigs: Record<string, ToolConfig> = {
  listFiles: {
    label: 'Workspace Files Listed',
    badge: 'Listed',
    icon: Folder,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  readFile: {
    label: 'File Read',
    badge: 'Read',
    icon: Search,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  writeFile: {
    label: 'File Written',
    badge: 'Updated',
    icon: Sparkles,
    accent: 'primary',
    accentBg: 'bg-primary-soft',
    accentBorder: 'border-primary/40',
    accentText: 'text-primary',
  },
  editFile: {
    label: 'File Edited',
    badge: 'Applied',
    icon: PencilLine,
    accent: 'warning',
    accentBg: 'bg-warning-soft',
    accentBorder: 'border-secondary/70',
    accentText: 'text-warning',
  },
  renameFile: {
    label: 'File Renamed',
    badge: 'Renamed',
    icon: PenLine,
    accent: 'accent-pink-deep',
    accentBg: 'bg-accent-pink-soft',
    accentBorder: 'border-accent-pink/70',
    accentText: 'text-accent-pink-deep',
  },
  deleteFile: {
    label: 'File Deleted',
    badge: 'Deleted',
    icon: Trash2,
    accent: 'danger',
    accentBg: 'bg-danger-soft',
    accentBorder: 'border-danger/40',
    accentText: 'text-danger',
  },
  webSearch: {
    label: 'Web Search Executed',
    badge: 'Searched',
    icon: Globe,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  extractUrl: {
    label: 'Web Page Extracted',
    badge: 'Extracted',
    icon: FileText,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
};

// Map legacy resume aliases directly to canonical tool configs
toolConfigs.writeResume = { ...toolConfigs.writeFile, label: 'Resume Updated' };
toolConfigs.readResume = { ...toolConfigs.readFile, label: 'Resume Read' };
toolConfigs.deleteResume = { ...toolConfigs.deleteFile, label: 'Resume Deleted', badge: 'Cleared' };
toolConfigs.editResume = { ...toolConfigs.editFile, label: 'Resume Edited' };

/**
 * Fallback config used when no entry in toolConfigs matches the invoked tool.
 */
const defaultConfig: ToolConfig = {
  label: 'Tool Executed',
  badge: 'Executed',
  icon: Wrench,
  accent: 'info',
  accentBg: 'bg-accent-blue-soft',
  accentBorder: 'border-accent-blue/60',
  accentText: 'text-info',
};

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
    <div className="flex items-center justify-between text-xs gap-2">
      <span className="font-medium font-mono text-text-primary truncate">{title}</span>
      {badge && (
        <span className={`text-[10px] font-mono shrink-0 font-medium ${badgeColorClass}`}>
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
      <p className="text-[11px] text-text-muted animate-pulse">{loadingText}</p>
    </div>
  );
}

/**
 * Maps a raw tool name (case, dashes, underscores ignored) to its canonical config key.
 * Recognized tools return isCustom: false; anything else passes through unchanged as custom.
 * @param raw - The tool name as it appears in the tool call payload.
 * @returns The canonical config key and whether the tool is not part of the known set.
 */
function normalizeToolName(raw: string): { normalized: string; isCustom: boolean } {
  if (!raw) return { normalized: '', isCustom: true };
  const clean = raw.trim().toLowerCase().replace(/[-_]/g, '');

  if (clean === 'listfiles' || clean === 'list') return { normalized: 'listFiles', isCustom: false };
  if (clean === 'readfile' || clean === 'readf') return { normalized: 'readFile', isCustom: false };
  if (clean === 'writefile' || clean === 'writef') return { normalized: 'writeFile', isCustom: false };
  if (clean === 'editfile' || clean === 'editf') return { normalized: 'editFile', isCustom: false };
  if (clean === 'deletefile' || clean === 'deletef') return { normalized: 'deleteFile', isCustom: false };
  if (clean === 'renamefile' || clean === 'renamef') return { normalized: 'renameFile', isCustom: false };
  if (clean === 'websearch' || clean === 'tavilysearch' || clean === 'tavily' || clean === 'search') return { normalized: 'webSearch', isCustom: false };
  if (clean === 'extracturl' || clean === 'extractpage' || clean === 'extract' || clean === 'tavilyextract') return { normalized: 'extractUrl', isCustom: false };

  if (clean === 'writeresume') return { normalized: 'writeResume', isCustom: false };
  if (clean === 'readresume') return { normalized: 'readResume', isCustom: false };
  if (clean === 'deleteresume') return { normalized: 'deleteResume', isCustom: false };
  if (clean === 'editresume') return { normalized: 'editResume', isCustom: false };

  return { normalized: raw, isCustom: true };
}

/**
 * Extracts name, args, result, and state from a tool call, tolerating several message shapes
 * (toolInvocation, toolCall, toolResult, or the call itself) and JSON-encoded string payloads.
 * @param toolCall - The tool call object from the assistant message.
 * @returns Normalized tool info, ready for config lookup and summary building.
 */
function extractToolInfo(toolCall: any) {
  if (!toolCall) return { name: '', rawName: '', args: {}, result: {}, state: 'result' as const, isCustom: true };

  const inv = toolCall.toolInvocation || toolCall.toolCall || toolCall.toolResult || toolCall;

  // Prefer an explicit toolName/name field, falling back to a "tool-*" type prefix.
  const rawName =
    inv?.toolName ||
    inv?.name ||
    inv?.function?.name ||
    toolCall?.toolName ||
    toolCall?.name ||
    (typeof inv?.type === 'string' && inv.type.startsWith('tool-') && inv.type !== 'tool-invocation'
      ? inv.type.replace(/^tool-/, '')
      : '') ||
    '';

  const { normalized: name, isCustom } = normalizeToolName(rawName);

  let args =
    inv?.args ||
    inv?.input ||
    inv?.parameters ||
    toolCall?.args ||
    toolCall?.input ||
    {};

  let result =
    inv?.result ||
    inv?.output ||
    inv?.response ||
    toolCall?.result ||
    toolCall?.output ||
    {};

  // Args and results may arrive as strings; parse them so summaries can read object fields.
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch {}
  }
  if (typeof result === 'string') {
    try { result = JSON.parse(result); } catch {}
  }

  // Infer the lifecycle state: explicit state wins, otherwise a non-empty result means "done".
  const state =
    inv?.state ||
    toolCall?.state ||
    (result && (typeof result !== 'object' || Object.keys(result).length > 0) ? 'result' : 'call');

  return { name, rawName, args, result, state: state as 'call' | 'partial-call' | 'result', isCustom };
}

/**
 * Summary for listFiles: file count plus comma-separated names.
 */
function buildListFilesSummary(args: any, result: any): ReactNode {
  const count = result?.count ?? (result?.files?.length || 0);
  const filesList = result?.files || [];

  return (
    <div className="py-1 space-y-0.5">
      <SummaryHeader
        title="Workspace Files"
        badge={`${count} file${count === 1 ? '' : 's'}`}
        badgeColorClass="text-text-muted"
      />
      <p className="text-[11px] text-text-muted font-mono truncate">
        {filesList.length > 0
          ? filesList.map((f: any) => f.name).join(', ')
          : 'No files in workspace'}
      </p>
    </div>
  );
}

/**
 * Summary for readFile: the file name, optional section, and a preview of the content
 * (or a "not found" message when the file or section does not exist).
 */
function buildReadFileSummary(args: any, result: any): ReactNode {
  const fileName = args?.nameOrId || result?.name || 'File';
  const section = args?.section || result?.section;
  const content = result?.content || (typeof result === 'string' ? result : '');

  return (
    <div className="py-1 space-y-0.5">
      <SummaryHeader
        title={fileName}
        badge={section ? `section: ${section}` : undefined}
      />
      <p className="text-[11px] text-text-muted truncate">
        {result?.exists === false
          ? result?.error || 'File or section not found'
          : content
          ? content.slice(0, 100).replace(/\s+/g, ' ')
          : 'File content read'}
      </p>
    </div>
  );
}

/**
 * Summary for writeFile: the target file name and the character count of the written content.
 */
function buildWriteFileSummary(args: any, result: any): ReactNode {
  const file: WorkspaceFile | null = result?.file || null;
  const name = args?.name || file?.name || 'document.md';
  const content = args?.content || file?.content || '';
  const charCount = content.length;

  return (
    <div className="py-1 space-y-0.5">
      <SummaryHeader
        title={name}
        badge={charCount > 0 ? `${charCount.toLocaleString()} chars` : 'updated'}
        badgeColorClass="text-primary/90"
      />
    </div>
  );
}

/**
 * Summary for editFile: the edited file name, the match strategy used, and any explanation or error.
 */
function buildEditFileSummary(args: any, result: any): ReactNode {
  const name = args?.nameOrId || result?.file?.name || 'File';

  return (
    <div className="py-1 space-y-0.5">
      <SummaryHeader
        title={name}
        badge={result?.strategyUsed ? `${result.strategyUsed} match` : undefined}
        badgeColorClass="text-warning/90"
      />
      {(args?.explanation || result?.explanation) && (
        <p className="text-[11px] text-text-muted truncate">
          {args?.explanation || result?.explanation}
        </p>
      )}
      {result?.error && (
        <p className="text-[11px] text-danger truncate">Error: {result.error}</p>
      )}
    </div>
  );
}

/**
 * Summary for renameFile: the old name struck through, an arrow, and the new name.
 */
function buildRenameFileSummary(args: any, result: any): ReactNode {
  const oldName = args?.nameOrId || result?.oldName || 'File';
  const newName = result?.newName || args?.newName || '';
  return (
    <div className="py-1 text-xs flex items-center gap-1.5 font-mono">
      <span className="text-text-muted line-through truncate">{oldName}</span>
      <span className="text-text-secondary">→</span>
      <span className="text-text-primary font-medium truncate">{newName}</span>
    </div>
  );
}

/**
 * Summary for deleteFile: a short confirmation naming the removed file.
 */
function buildDeleteFileSummary(args: any, result: any): ReactNode {
  const name = args?.nameOrId || result?.name || 'File';
  return (
    <div className="py-1 text-xs font-mono text-text-muted">
      File <span className="text-danger font-medium">{name}</span> removed from workspace.
    </div>
  );
}

/**
 * Summary for webSearch: the query, result count, an optional AI answer, and up to three
 * result sources shown as hostnames.
 */
function buildWebSearchSummary(args: any, result: any, status?: string): ReactNode {
  const query = args?.query || result?.query || 'Web Search';
  const resultsList = result?.results || [];
  const count = resultsList.length;
  const answer = result?.answer;
  const isLoading = status === 'loading' || (!result || Object.keys(result).length === 0);

  if (isLoading && !result?.error) {
    return (
      <InFlightSummary
        title={`"${query}"`}
        badgeText="searching..."
        loadingText="Querying Tavily search API and retrieving web sources..."
      />
    );
  }

  return (
    <div className="py-1 space-y-0.5">
      <SummaryHeader
        title={`"${query}"`}
        badge={`${count} result${count === 1 ? '' : 's'}`}
      />
      {answer && (
        <p className="text-[11px] text-text-muted line-clamp-2">
          {answer}
        </p>
      )}
      {result?.error ? (
        <p className="text-[11px] text-danger truncate">Error: {result.error}</p>
      ) : resultsList.length > 0 ? (
        <p className="text-[10px] font-mono text-text-muted/80 truncate">
          Sources:{' '}
          {resultsList
            .map((r: any) => {
              try {
                return new URL(r.url).hostname.replace(/^www\./, '');
              } catch {
                return r.title || r.url;
              }
            })
            .filter(Boolean)
            .slice(0, 3)
            .join(', ')}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Summary for extractUrl: the requested URLs, the number of pages extracted, and a
 * content preview of the first extraction.
 */
function buildExtractUrlSummary(args: any, result: any, status?: string): ReactNode {
  const urls: string[] = args?.urls || [];
  const extracted = result?.extracted || [];
  const count = extracted.length;
  const firstTitle = extracted[0]?.title;
  const displayTitle = firstTitle || (urls.length > 0 ? urls.join(', ') : 'URL Extraction');
  const isLoading = status === 'loading' || (!result || Object.keys(result).length === 0);

  if (isLoading && !result?.error) {
    return (
      <InFlightSummary
        title={urls.length > 0 ? urls.join(', ') : 'URL Extraction'}
        badgeText="extracting..."
        loadingText={`Parsing clean Markdown content from ${urls.length || 1} web page${urls.length === 1 ? '' : 's'}...`}
      />
    );
  }

  return (
    <div className="py-1 space-y-0.5">
      <SummaryHeader
        title={displayTitle}
        badge={`${count} page${count === 1 ? '' : 's'} extracted`}
      />
      {result?.error ? (
        <p className="text-[11px] text-danger truncate">Error: {result.error}</p>
      ) : extracted.length > 0 ? (
        <p className="text-[11px] text-text-muted line-clamp-2 font-mono">
          {extracted[0]?.rawContent?.slice(0, 150).replace(/\s+/g, ' ')}...
        </p>
      ) : null}
    </div>
  );
}

/**
 * Fallback summary for tools without a dedicated builder: just the raw tool name.
 */
function buildGenericSummary(args: any, rawName: string): ReactNode {
  return (
    <div className="py-1 text-xs">
      <p className="font-medium text-text-primary truncate">{rawName || 'Tool Execution'}</p>
    </div>
  );
}

/**
 * Turns an arbitrary tool call into display-ready ToolCardProps for ToolCallCard.
 * Resolves the config, derives the status, picks the summary builder, and, for write tools,
 * upgrades the badge to "Created"/"Replaced" when the result reports that action.
 * @param toolCall - The tool call object from the assistant message.
 * @param onOpenDrawer - Optional callback forwarded to the card for opening the details drawer.
 * @returns ToolCardProps describing how to render this invocation.
 */
export function resolveToolDisplay(toolCall: any, onOpenDrawer?: () => void): ToolCardProps {
  const { name, rawName, args, result, state, isCustom } = extractToolInfo(toolCall);

  let cfg = toolConfigs[name] || defaultConfig;
  // Custom tools have no config label, so surface their raw name instead.
  let label = !isCustom ? cfg.label : (rawName || cfg.label);
  const status = state === 'call' || state === 'partial-call' ? 'loading' : result?.success === false ? 'error' : 'success';

  const action = (result as any)?.action;
  if ((name === 'writeFile' || name === 'writeResume') && (action === 'created' || action === 'replaced')) {
    cfg = { ...cfg, badge: action === 'created' ? 'Created' : 'Replaced' };
    label = action === 'created' ? 'File Created' : 'File Replaced';
  }

  // Route the tool to its dedicated summary builder; unknown tools fall back to the generic one.
  let summary: ReactNode;
  switch (name) {
    case 'listFiles':
      summary = buildListFilesSummary(args, result);
      break;
    case 'readFile':
    case 'readResume':
      summary = buildReadFileSummary(args, result);
      break;
    case 'writeFile':
    case 'writeResume':
      summary = buildWriteFileSummary(args, result);
      break;
    case 'editFile':
    case 'editResume':
      summary = buildEditFileSummary(args, result);
      break;
    case 'renameFile':
      summary = buildRenameFileSummary(args, result);
      break;
    case 'deleteFile':
    case 'deleteResume':
      summary = buildDeleteFileSummary(args, result);
      break;
    case 'webSearch':
      summary = buildWebSearchSummary(args, result, status);
      break;
    case 'extractUrl':
      summary = buildExtractUrlSummary(args, result, status);
      break;
    default:
      summary = buildGenericSummary(args, rawName);
  }

  return {
    label,
    badge: cfg.badge,
    icon: cfg.icon,
    accent: cfg.accent,
    accentBg: cfg.accentBg,
    accentBorder: cfg.accentBorder,
    accentText: cfg.accentText,
    status,
    summary,
    rawArgs: args,
    rawResult: result,
    onOpenDrawer,
  };
}

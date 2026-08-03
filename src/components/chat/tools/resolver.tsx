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
    label: 'List Files',
    badge: 'Listed',
    icon: Folder,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  readFile: {
    label: 'Read File',
    badge: 'Read',
    icon: Search,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  writeFile: {
    label: 'Write File',
    badge: 'Written',
    icon: Sparkles,
    accent: 'primary',
    accentBg: 'bg-primary-soft',
    accentBorder: 'border-primary/40',
    accentText: 'text-primary',
  },
  editFile: {
    label: 'Edit File',
    badge: 'Edited',
    icon: PencilLine,
    accent: 'warning',
    accentBg: 'bg-warning-soft',
    accentBorder: 'border-secondary/70',
    accentText: 'text-warning',
  },
  renameFile: {
    label: 'Rename File',
    badge: 'Renamed',
    icon: PenLine,
    accent: 'accent-pink-deep',
    accentBg: 'bg-accent-pink-soft',
    accentBorder: 'border-accent-pink/70',
    accentText: 'text-accent-pink-deep',
  },
  deleteFile: {
    label: 'Delete File',
    badge: 'Deleted',
    icon: Trash2,
    accent: 'danger',
    accentBg: 'bg-danger-soft',
    accentBorder: 'border-danger/40',
    accentText: 'text-danger',
  },
  webSearch: {
    label: 'Web Search',
    badge: 'Searched',
    icon: Globe,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  extractUrl: {
    label: 'Extract URL',
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
 * Summary for listFiles: files found in workspace.
 */
function buildListFilesSummary(args: any, result: any): ReactNode {
  const filesList: Array<{ name: string }> = result?.files || [];
  return (
    <div className="py-1 space-y-1 font-mono text-xs">
      <div className="text-text-muted font-medium text-[11px]">Files Found:</div>
      {filesList.length > 0 ? (
        <ul className="space-y-0.5 text-text-secondary pl-2">
          {filesList.map((f, i) => (
            <li key={i} className="truncate">• {f.name}</li>
          ))}
        </ul>
      ) : (
        <p className="text-text-muted italic text-[11px]">No files in workspace</p>
      )}
    </div>
  );
}

/**
 * Summary for readFile: the file read.
 */
function buildReadFileSummary(args: any, result: any): ReactNode {
  const fileName = args?.nameOrId || result?.name || 'File';
  return (
    <div className="py-1 font-mono text-xs flex items-center gap-1.5">
      <span className="text-text-muted text-[11px]">File Read:</span>
      <span className="text-text-primary font-medium truncate">{fileName}</span>
    </div>
  );
}

/**
 * Summary for writeFile: the file created or updated.
 */
function buildWriteFileSummary(args: any, result: any): ReactNode {
  const name = args?.name || result?.file?.name || 'File';
  const isCreated = result?.action === 'created';
  return (
    <div className="py-1 font-mono text-xs flex items-center gap-1.5">
      <span className="text-text-muted text-[11px]">{isCreated ? 'File Created:' : 'File Updated:'}</span>
      <span className="text-primary font-medium truncate">{name}</span>
    </div>
  );
}

/**
 * Summary for editFile: the file edited.
 */
function buildEditFileSummary(args: any, result: any): ReactNode {
  const name = args?.nameOrId || result?.file?.name || 'File';
  return (
    <div className="py-1 font-mono text-xs flex items-center gap-1.5">
      <span className="text-text-muted text-[11px]">File Edited:</span>
      <span className="text-warning font-medium truncate">{name}</span>
    </div>
  );
}

/**
 * Summary for renameFile: the old name and new name.
 */
function buildRenameFileSummary(args: any, result: any): ReactNode {
  const oldName = args?.nameOrId || result?.oldName || 'File';
  const newName = result?.newName || args?.newName || '';
  return (
    <div className="py-1 font-mono text-xs flex items-center gap-1.5">
      <span className="text-text-muted text-[11px]">File Renamed:</span>
      <span className="text-text-muted line-through truncate">{oldName}</span>
      <span className="text-text-secondary">→</span>
      <span className="text-text-primary font-medium truncate">{newName}</span>
    </div>
  );
}

/**
 * Summary for deleteFile: the file deleted.
 */
function buildDeleteFileSummary(args: any, result: any): ReactNode {
  const name = args?.nameOrId || result?.name || 'File';
  return (
    <div className="py-1 font-mono text-xs flex items-center gap-1.5">
      <span className="text-text-muted text-[11px]">File Removed:</span>
      <span className="text-danger font-medium truncate">{name}</span>
    </div>
  );
}

/**
 * Summary for webSearch: search query and URLs found.
 */
function buildWebSearchSummary(args: any, result: any, status?: string): ReactNode {
  const query = args?.query || result?.query || '';
  const resultsList: Array<{ title?: string; url: string }> = result?.results || [];

  return (
    <div className="py-1 space-y-1.5 font-mono text-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted text-[11px]">Query:</span>
        <span className="text-text-primary font-medium truncate">&quot;{query}&quot;</span>
      </div>
      {resultsList.length > 0 && (
        <div className="space-y-0.5">
          <span className="text-text-muted text-[11px] block">URLs Found:</span>
          <ul className="space-y-0.5 text-text-secondary text-[11px] pl-2">
            {resultsList.map((r, i) => (
              <li key={i} className="truncate">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-info truncate block"
                >
                  {r.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result?.error && (
        <p className="text-[11px] text-danger truncate">Error: {result.error}</p>
      )}
    </div>
  );
}

/**
 * Summary for extractUrl: target URLs extracted.
 */
function buildExtractUrlSummary(args: any, result: any, status?: string): ReactNode {
  const urls: string[] = args?.urls || [];
  const extracted: Array<{ url: string; title?: string }> = result?.extracted || [];
  const displayUrls = extracted.length > 0 ? extracted.map((e) => e.url) : urls;

  return (
    <div className="py-1 space-y-1 font-mono text-xs">
      <span className="text-text-muted text-[11px] block">Extracted URLs:</span>
      {displayUrls.length > 0 ? (
        <ul className="space-y-0.5 text-text-secondary text-[11px] pl-2">
          {displayUrls.map((url, i) => (
            <li key={i} className="truncate">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-info truncate block"
              >
                {url}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-muted italic text-[11px]">No URLs extracted</p>
      )}
      {result?.error && (
        <p className="text-[11px] text-danger truncate">Error: {result.error}</p>
      )}
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

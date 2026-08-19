import React, { type ReactNode } from 'react';
import {
  type LucideIcon,
  Files,
  FileSearch,
  FilePlus2,
  FileEdit,
  PenTool,
  FileX,
  Globe,
  Link2,
  Wrench,
} from 'lucide-react';
import {
  buildListFilesSummary,
  buildReadFileSummary,
  buildWriteFileSummary,
  buildEditFileSummary,
  buildRenameFileSummary,
  buildDeleteFileSummary,
  buildWebSearchSummary,
  buildExtractUrlSummary,
  buildGenericSummary,
} from './summaries';

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
    icon: Files,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  readFile: {
    label: 'Read File',
    badge: 'Read',
    icon: FileSearch,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
  writeFile: {
    label: 'Write File',
    badge: 'Written',
    icon: FilePlus2,
    accent: 'primary',
    accentBg: 'bg-primary-soft',
    accentBorder: 'border-primary/40',
    accentText: 'text-primary',
  },
  editFile: {
    label: 'Edit File',
    badge: 'Edited',
    icon: FileEdit,
    accent: 'warning',
    accentBg: 'bg-warning-soft',
    accentBorder: 'border-secondary/70',
    accentText: 'text-warning',
  },
  renameFile: {
    label: 'Rename File',
    badge: 'Renamed',
    icon: PenTool,
    accent: 'accent-pink-deep',
    accentBg: 'bg-accent-pink-soft',
    accentBorder: 'border-accent-pink/70',
    accentText: 'text-accent-pink-deep',
  },
  deleteFile: {
    label: 'Delete File',
    badge: 'Deleted',
    icon: FileX,
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
    icon: Link2,
    accent: 'info',
    accentBg: 'bg-accent-blue-soft',
    accentBorder: 'border-accent-blue/60',
    accentText: 'text-info',
  },
};

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

  return { normalized: raw, isCustom: true };
}

/**
 * Helper to determine if a tool result has meaningful output payload.
 */
function hasMeaningfulResult(result: any): boolean {
  if (result === undefined || result === null) return false;
  if (typeof result === 'string') return result.length > 0;
  if (typeof result === 'boolean' || typeof result === 'number') return true;
  if (typeof result === 'object') {
    return Object.keys(result).length > 0;
  }
  return false;
}

/**
 * Helper to detect if a tool call or result represents an error state.
 */
function hasErrorShape(result: any, state?: string): boolean {
  if (state === 'output-error') return true;
  if (result && typeof result === 'object') {
    if (result.success === false || typeof result.error === 'string') return true;
  }
  return false;
}

/**
 * Extracts normalized tool status matching AI SDK 7 modern and legacy lifecycle states.
 */
function extractToolStatus(inv: any, result: any, state: string): 'loading' | 'success' | 'error' {
  if (hasErrorShape(result, state)) return 'error';

  // Support both AI SDK 7 modern states (output-available, output-error) and legacy states (result)
  const isTerminalState = state === 'output-available' || state === 'result';
  if (isTerminalState && hasMeaningfulResult(result)) {
    return 'success';
  }

  // input-streaming | input-available | call | partial-call | missing payload -> loading
  return 'loading';
}

/**
 * Extracts name, args, result, and status from a tool call object.
 */
function extractToolInfo(toolCall: any) {
  if (!toolCall) return { name: '', rawName: '', args: {}, result: {}, state: 'input-available', status: 'error' as const, isCustom: true };

  const inv = toolCall.toolInvocation || toolCall.toolCall || toolCall.toolResult || toolCall;

  // Prefer explicit toolName/name field
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
    toolCall?.output;

  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch {}
  }
  if (typeof result === 'string') {
    try { result = JSON.parse(result); } catch {}
  }

  const rawState = inv?.state || toolCall?.state || (result && hasMeaningfulResult(result) ? 'output-available' : 'input-available');
  const status = extractToolStatus(inv, result, rawState);

  return { name, rawName, args, result: result || {}, state: rawState, status, isCustom };
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
  const { name, rawName, args, result, status, isCustom } = extractToolInfo(toolCall);

  let cfg = toolConfigs[name] || defaultConfig;
  // Custom tools have no config label, so surface their raw name instead.
  let label = !isCustom ? cfg.label : (rawName || cfg.label);

  const action = (result as any)?.action;
  if (name === 'writeFile' && (action === 'created' || action === 'replaced')) {
    cfg = { ...cfg, badge: action === 'created' ? 'Created' : 'Replaced' };
    label = action === 'created' ? 'File Created' : 'File Replaced';
  }

  // Route the tool to its dedicated summary builder, passing status
  let summary: ReactNode;
  switch (name) {
    case 'listFiles':
      summary = buildListFilesSummary(args, result, status);
      break;
    case 'readFile':
      summary = buildReadFileSummary(args, result, status);
      break;
    case 'writeFile':
      summary = buildWriteFileSummary(args, result, status);
      break;
    case 'editFile':
      summary = buildEditFileSummary(args, result, status);
      break;
    case 'renameFile':
      summary = buildRenameFileSummary(args, result, status);
      break;
    case 'deleteFile':
      summary = buildDeleteFileSummary(args, result, status);
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
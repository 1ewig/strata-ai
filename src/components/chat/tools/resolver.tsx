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

/** Signature of a per-tool summary builder. */
type SummaryBuilder = (args: any, result: any, status: 'loading' | 'success' | 'error') => ReactNode;

/**
 * Shared "info" accent set, spread by every tool config that uses it.
 */
const INFO_ACCENT = {
  accent: 'info',
  accentBg: 'bg-accent-blue-soft',
  accentBorder: 'border-accent-blue/60',
  accentText: 'text-info',
} as const;

/**
 * Per-tool display configs + summary builders keyed by normalized tool name.
 * Each tool is declared exactly once; the dispatch in resolveToolDisplay is a
 * plain table lookup against this registry.
 */
const toolMeta: Record<string, { config: ToolConfig; summary: SummaryBuilder }> = {
  listFiles: {
    config: { ...INFO_ACCENT, label: 'List Files', badge: 'Listed', icon: Files },
    summary: buildListFilesSummary,
  },
  readFile: {
    config: { ...INFO_ACCENT, label: 'Read File', badge: 'Read', icon: FileSearch },
    summary: buildReadFileSummary,
  },
  writeFile: {
    config: {
      accent: 'primary',
      accentBg: 'bg-primary-soft',
      accentBorder: 'border-primary/40',
      accentText: 'text-primary',
      label: 'Write File',
      badge: 'Written',
      icon: FilePlus2,
    },
    summary: buildWriteFileSummary,
  },
  editFile: {
    config: {
      accent: 'warning',
      accentBg: 'bg-warning-soft',
      accentBorder: 'border-secondary/70',
      accentText: 'text-warning',
      label: 'Edit File',
      badge: 'Edited',
      icon: FileEdit,
    },
    summary: buildEditFileSummary,
  },
  renameFile: {
    config: {
      accent: 'accent-pink-deep',
      accentBg: 'bg-accent-pink-soft',
      accentBorder: 'border-accent-pink/70',
      accentText: 'text-accent-pink-deep',
      label: 'Rename File',
      badge: 'Renamed',
      icon: PenTool,
    },
    summary: buildRenameFileSummary,
  },
  deleteFile: {
    config: {
      accent: 'danger',
      accentBg: 'bg-danger-soft',
      accentBorder: 'border-danger/40',
      accentText: 'text-danger',
      label: 'Delete File',
      badge: 'Deleted',
      icon: FileX,
    },
    summary: buildDeleteFileSummary,
  },
  webSearch: {
    config: { ...INFO_ACCENT, label: 'Web Search', badge: 'Searched', icon: Globe },
    summary: buildWebSearchSummary,
  },
  extractUrl: {
    config: { ...INFO_ACCENT, label: 'Extract URL', badge: 'Extracted', icon: Link2 },
    summary: buildExtractUrlSummary,
  },
};

/**
 * Fallback config used when no entry in toolMeta matches the invoked tool.
 */
const defaultConfig: ToolConfig = {
  ...INFO_ACCENT,
  label: 'Tool Executed',
  badge: 'Executed',
  icon: Wrench,
};

/**
 * Canonical tool-name aliases: raw tool names (case, dashes, underscores
 * stripped) map to their normalized config key.
 */
const TOOL_ALIASES: Record<string, string> = {
  listfiles: 'listFiles',
  list: 'listFiles',
  readfile: 'readFile',
  readf: 'readFile',
  writefile: 'writeFile',
  writef: 'writeFile',
  editfile: 'editFile',
  editf: 'editFile',
  deletefile: 'deleteFile',
  deletef: 'deleteFile',
  renamefile: 'renameFile',
  renamef: 'renameFile',
  websearch: 'webSearch',
  tavilysearch: 'webSearch',
  tavily: 'webSearch',
  search: 'webSearch',
  extracturl: 'extractUrl',
  extractpage: 'extractUrl',
  extract: 'extractUrl',
  tavilyextract: 'extractUrl',
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
  const normalized = TOOL_ALIASES[clean];
  return normalized
    ? { normalized, isCustom: false }
    : { normalized: raw, isCustom: true };
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

  const meta = toolMeta[name];
  let cfg = meta?.config || defaultConfig;
  // Custom tools have no config label, so surface their raw name instead.
  let label = !isCustom ? cfg.label : (rawName || cfg.label);

  const action = (result as any)?.action;
  if (name === 'writeFile' && (action === 'created' || action === 'replaced')) {
    cfg = { ...cfg, badge: action === 'created' ? 'Created' : 'Replaced' };
    label = action === 'created' ? 'File Created' : 'File Replaced';
  }

  const summary = meta ? meta.summary(args, result, status) : buildGenericSummary(args, rawName);

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
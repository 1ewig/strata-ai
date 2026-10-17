/**
 * Structural representation of a normalized tool part extracted from assistant messages.
 */
export interface NormalizedToolPart {
  callId: string;
  name: string;
  rawName: string;
  args: Record<string, unknown> | unknown;
  result: unknown;
  state: string;
  status: 'loading' | 'success' | 'error';
  isCustom: boolean;
}

/**
 * Checks whether a message part represents a tool call or invocation.
 */
export function isToolPart(part: unknown): boolean {
  if (!part || typeof part !== 'object') return false;
  const p = part as Record<string, unknown>;
  const type = typeof p.type === 'string' ? p.type : '';
  return (
    type === 'tool-invocation' ||
    type === 'dynamic-tool' ||
    type.startsWith('tool') ||
    p.toolInvocation !== undefined
  );
}

/**
 * Normalizes any tool part (modern AI SDK v4+ typed parts or legacy invocations)
 * into a single canonical model.
 */
export function normalizeToolPart(part: unknown, fallbackIndex = 0): NormalizedToolPart {
  if (!part || typeof part !== 'object') {
    return {
      callId: `tool-${fallbackIndex}`,
      name: 'Tool',
      rawName: 'Tool',
      args: {},
      result: undefined,
      state: 'input-available',
      status: 'loading',
      isCustom: false,
    };
  }

  const p = part as Record<string, unknown>;
  const inv = (p.toolInvocation && typeof p.toolInvocation === 'object' ? p.toolInvocation : p) as Record<string, unknown>;
  const callObj = (p.callObj && typeof p.callObj === 'object' ? p.callObj : {}) as Record<string, unknown>;

  const isCustom = !inv.toolName && !inv.name && (callObj.type === 'custom' || p.type === 'custom');

  const rawName =
    (typeof inv.toolName === 'string' && inv.toolName) ||
    (typeof inv.name === 'string' && inv.name) ||
    (typeof callObj.toolName === 'string' && callObj.toolName) ||
    (typeof callObj.name === 'string' && callObj.name) ||
    (typeof callObj.title === 'string' && callObj.title) ||
    (typeof p.toolName === 'string' && p.toolName) ||
    (typeof p.name === 'string' && p.name) ||
    (isCustom ? 'Custom Action' : 'Tool');

  const name = isCustom ? 'custom' : rawName;

  const callId =
    (typeof inv.toolCallId === 'string' && inv.toolCallId) ||
    (typeof p.toolCallId === 'string' && p.toolCallId) ||
    (typeof inv.id === 'string' && inv.id) ||
    (typeof p.id === 'string' && p.id) ||
    `tool-${fallbackIndex}`;

  let args = inv.args ?? inv.input ?? inv.parameters ?? callObj.args ?? callObj.input ?? p.input ?? {};
  let result = inv.result ?? inv.output ?? inv.response ?? callObj.result ?? callObj.output ?? p.output;

  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch {}
  }
  if (typeof result === 'string') {
    try { result = JSON.parse(result); } catch {}
  }

  const stateStr =
    typeof inv.state === 'string'
      ? inv.state
      : typeof callObj.state === 'string'
        ? callObj.state
        : typeof p.state === 'string'
          ? p.state
          : '';

  const rawState =
    stateStr ||
    (result && (typeof result !== 'object' || Object.keys(result as object).length > 0)
      ? 'output-available'
      : 'input-available');

  let status: 'loading' | 'success' | 'error' = 'loading';
  if (rawState === 'error' || rawState === 'failed') {
    status = 'error';
  } else if (rawState === 'output-available' || rawState === 'result' || rawState === 'complete') {
    if (result && typeof result === 'object') {
      const resObj = result as Record<string, unknown>;
      if (resObj.success === false || resObj.deleted === false || resObj.error) {
        status = 'error';
      } else {
        status = 'success';
      }
    } else {
      status = 'success';
    }
  }

  return {
    callId,
    name,
    rawName,
    args,
    result: result ?? undefined,
    state: rawState,
    status,
    isCustom,
  };
}

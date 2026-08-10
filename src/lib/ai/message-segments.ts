/**
 * A flattened, render-ready slice of a message: user text, markdown text,
 * reasoning/thought content, a tool invocation part, or a work group of reasoning + tools.
 */
export interface Segment {
  type: 'user-text' | 'text' | 'reasoning' | 'tool' | 'work-group' | string;
  content?: string;
  part?: any;
  items?: Segment[];
  key: string;
}

/**
 * Transforms a raw AI SDK UI message into an ordered array of render-ready segments.
 *
 * During active streaming (`isStreaming: true`), all parts (thoughts, tool calls,
 * intermediate text) remain ungrouped and stream in real-time order.
 *
 * Once inference completes (`isStreaming: false`), all pre-answer output
 * (intermediate narration, reasoning accordions, and tool execution cards) is
 * folded into a single collapsible `work-group` segment, leaving only the final
 * assistant response as the main message body.
 *
 * @param message - The raw message object (user or assistant).
 * @param isStreaming - True while the assistant response is actively in-flight.
 * @returns Array of typed segments ready for component mapping.
 */
export function flattenMessageSegments(
  message: { role?: string; content?: string; parts?: any[]; metadata?: any },
  isStreaming = false,
): Segment[] {
  const isUser = message.role === 'user';

  if (isUser) {
    // User bubbles show a single combined bubble: join every text part.
    let userText = '';
    if (Array.isArray(message.parts)) {
      userText = message.parts
        .filter((p) => p.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text)
        .join('');
    }
    if (!userText && typeof message.content === 'string') {
      userText = message.content;
    }
    return [{ type: 'user-text', content: userText, key: 'user-text' }];
  }

  // Legacy messages without parts fall back to the raw content string.
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    const text = typeof message.content === 'string' ? message.content : '';
    return text ? [{ type: 'text', content: text, key: 'text-0' }] : [];
  }

  const rawSegments: Segment[] = [];
  let currentText = '';

  // Detect tool invocations and reasoning/thought parts across both the
  // streaming parts schema and legacy shape variants.
  message.parts.forEach((p, idx) => {
    const isTool =
      p.type === 'tool-invocation' ||
      p.type === 'dynamic-tool' ||
      (typeof p.type === 'string' && p.type.startsWith('tool')) ||
      p.toolInvocation !== undefined;

    const isReasoning =
      p.type === 'reasoning' ||
      p.type === 'thought' ||
      p.type === 'thinking' ||
      typeof p.reasoning === 'string' ||
      typeof p.reasoningText === 'string';

    if (isReasoning) {
      if (currentText) {
        rawSegments.push({ type: 'text', content: currentText, key: `text-${idx}` });
        currentText = '';
      }
      const reasoningText =
        p.reasoning ||
        p.reasoningText ||
        p.thought ||
        (p.type === 'reasoning' || p.type === 'thought' || p.type === 'thinking' ? p.text : '') ||
        '';
      if (reasoningText) {
        rawSegments.push({ type: 'reasoning', content: reasoningText, key: `reasoning-${idx}` });
      }
    } else if (isTool) {
      if (currentText) {
        rawSegments.push({ type: 'text', content: currentText, key: `text-${idx}` });
        currentText = '';
      }
      const inv = p.toolInvocation || p;
      const key = inv.toolCallId || p.toolCallId || `tool-${idx}`;
      rawSegments.push({ type: 'tool', part: p, key });
    } else if (p.type === 'text' && typeof p.text === 'string') {
      currentText += p.text;
    }
  });

  if (currentText) {
    rawSegments.push({ type: 'text', content: currentText, key: 'text-final' });
  }

  // Last resort: render the raw content string if segmentation produced nothing.
  if (rawSegments.length === 0 && typeof message.content === 'string' && message.content) {
    rawSegments.push({ type: 'text', content: message.content, key: 'text-fallback' });
  }

  // Ensure streaming or compaction messages always have a text segment to render
  if (rawSegments.length === 0 && (isStreaming || message.metadata?.isCompactedSummary)) {
    rawSegments.push({ type: 'text', content: '', key: 'text-initial' });
  }

  // While streaming, render each part live and ungrouped so thoughts, tool
  // calls, and intermediate text stream in place. Grouping happens only once
  // the inference finishes (isStreaming flips false and the memo recomputes).
  if (isStreaming) {
    return rawSegments;
  }

  // Group ALL pre-answer output (intermediate text + reasoning + tool calls) into
  // a single work group so a multi-response inference reads as one compact block.
  // Only the final text segment renders as the assistant message bubble.
  const result: Segment[] = [];
  const lastSegment = rawSegments[rawSegments.length - 1];
  const hasFinalText = lastSegment?.type === 'text';
  const workItems = hasFinalText ? rawSegments.slice(0, -1) : rawSegments;

  if (workItems.length > 0) {
    result.push({ type: 'work-group', items: workItems, key: 'work-group-single' });
  }
  if (hasFinalText) {
    result.push(lastSegment);
  }

  return result;
}

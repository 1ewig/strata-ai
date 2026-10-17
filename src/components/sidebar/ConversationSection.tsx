import React from 'react';

interface ConversationSectionProps {
  /** Section heading shown in the shared eyebrow style. */
  label: string;
  /** Optional trailing content rendered at the right of the header (e.g. a count). */
  trailing?: React.ReactNode;
  /** The section's conversation rows. */
  children: React.ReactNode;
}

/**
 * Labeled group of conversation rows in the sidebar. Reuses the eyebrow header
 * styling shared across sidebar sections so grouping stays visually consistent.
 */
function ConversationSection({ label, trailing, children }: ConversationSectionProps) {
  return (
    <div className="space-y-1">
      <div className="px-2 py-1 flex items-center justify-between text-micro font-semibold text-text-muted uppercase tracking-wider">
        <span>{label}</span>
        {trailing}
      </div>
      {children}
    </div>
  );
}

export default React.memo(ConversationSection);

'use client';

import React from 'react';
import { Check, Code2 } from 'lucide-react';

type Variant = 'assistant' | 'user';

interface TokenSet {
  heading1Text: string;
  heading1Border: string;
  heading1MT: string;
  heading1MB: string;
  heading1PB: string;
  heading2Text: string;
  heading2MT: string;
  heading2MB: string;
  heading3Text: string;
  heading3MT: string;
  heading3MB: string;
  paraText: string;
  paraMB: string;
  listText: string;
  listSpacing: string;
  listMT: string;
  listMB: string;
  strongText: string;
  codeInline: string;
  codeBlockBorder: string;
  codeBlockExtra: string;
  snippetPrefix: string;
  tableWrap: string;
  tableText: string;
  thCell: string;
  tdCell: string;
  blockquoteText: string;
  blockquoteBorder: string;
  hrBorder: string;
  hrMy: string;
  linkClass: string;
  emEl: (({ children }: any) => React.ReactNode) | null;
}

const TOKENS: Record<Variant, TokenSet> = {
  assistant: {
    heading1Text: 'text-text-bright',
    heading1Border: 'border-edge-raised/80',
    heading1MT: 'mt-3',
    heading1MB: 'mb-2',
    heading1PB: 'pb-1.5',
    heading2Text: 'text-primary/90',
    heading2MT: 'mt-3',
    heading2MB: 'mb-1.5',
    heading3Text: 'text-text-primary',
    heading3MT: 'mt-2',
    heading3MB: 'mb-1',
    paraText: '',
    paraMB: 'mb-2.5',
    listText: 'text-text-secondary',
    listSpacing: 'space-y-1.5',
    listMT: 'mb-3',
    listMB: 'mb-3',
    strongText: 'text-text-bright',
    codeInline: 'bg-surface-elevated/90 text-primary font-mono px-1.5 py-0.5 rounded text-micro border border-edge-hover/60',
    codeBlockBorder: 'border-edge-raised/80',
    codeBlockExtra: '',
    snippetPrefix: 'snippet-',
    tableWrap: 'my-3 rounded-xl border border-edge-raised/80 bg-surface-base/40',
    tableText: 'text-text-secondary',
    thCell: 'bg-surface-elevated/70 px-3 py-2 border-b border-edge-raised font-semibold text-text-primary',
    tdCell: 'px-3 py-2 border-b border-edge-raised/40 hover:bg-surface-hover/20',
    blockquoteText: 'text-text-muted',
    blockquoteBorder: 'border-primary/60',
    hrBorder: 'border-edge-raised',
    hrMy: 'my-3.5',
    linkClass: 'text-primary underline decoration-primary/50 hover:decoration-primary font-medium transition-colors',
    emEl: null,
  },
  user: {
    heading1Text: 'text-surface',
    heading1Border: 'border-surface/30',
    heading1MT: 'mt-2',
    heading1MB: 'mb-1.5',
    heading1PB: 'pb-1',
    heading2Text: 'text-surface',
    heading2MT: 'mt-2',
    heading2MB: 'mb-1',
    heading3Text: 'text-surface',
    heading3MT: 'mt-1.5',
    heading3MB: 'mb-0.5',
    paraText: 'text-surface',
    paraMB: 'mb-2',
    listText: 'text-surface/95',
    listSpacing: 'space-y-1',
    listMT: 'my-1.5',
    listMB: 'my-1.5',
    strongText: 'text-surface',
    codeInline: 'bg-surface/20 text-surface font-mono px-1.5 py-0.5 rounded text-micro border border-surface/30',
    codeBlockBorder: 'border-edge-raised/80',
    codeBlockExtra: 'text-text-primary text-left',
    snippetPrefix: 'user-snippet-',
    tableWrap: 'my-2.5 rounded-xl border border-surface/30 bg-surface/10',
    tableText: 'text-surface',
    thCell: 'bg-surface/20 px-3 py-1.5 border-b border-surface/30 font-semibold text-surface',
    tdCell: 'px-3 py-1.5 border-b border-surface/20 hover:bg-surface/15',
    blockquoteText: 'text-surface/90',
    blockquoteBorder: 'border-surface/60',
    hrBorder: 'border-surface/30',
    hrMy: 'my-3',
    linkClass: 'underline decoration-surface/60 hover:decoration-surface transition-colors font-medium text-surface',
    emEl: ({ children }: any) => <em className="italic text-surface/90">{children}</em>,
  },
};

/**
 * Builds a ReactMarkdown component dictionary for a given bubble variant.
 * Assistant theme uses dark-on-light tokens; user theme uses light-on-primary tokens.
 */
export function createMarkdownComponents(
  variant: Variant,
  copiedCodeId: string | null,
  onCopy: (code: string, id: string) => void,
) {
  const T = TOKENS[variant];

  const sharedComponents: Record<string, (props: any) => React.ReactNode> = {
    h1: ({ children }: any) => (
      <h1 className={`text-title font-display font-bold ${T.heading1Text} ${T.heading1MT} ${T.heading1MB} border-b ${T.heading1Border} ${T.heading1PB} flex items-center gap-2`}>
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className={`text-heading font-display font-bold ${T.heading2Text} ${T.heading2MT} ${T.heading2MB} tracking-wide`}>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className={`text-subheading font-semibold ${T.heading3Text} ${T.heading3MT} ${T.heading3MB}`}>
        {children}
      </h3>
    ),
    p: ({ children }: any) => (
      <p className={`text-body ${T.paraMB} leading-relaxed last:mb-0 ${T.paraText}`}>{children}</p>
    ),
    ul: ({ children }: any) => (
      <ul className={`list-disc list-inside ${T.listSpacing} ${T.listMT} ${T.listText}`}>{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className={`list-decimal list-inside ${T.listSpacing} ${T.listMB} ${T.listText}`}>{children}</ol>
    ),
    li: ({ children }: any) => <li className="text-body leading-relaxed">{children}</li>,
    strong: ({ children }: any) => (
      <strong className={`font-semibold ${T.strongText}`}>{children}</strong>
    ),
    code: ({ className, children, ...props }: any) => {
      const isInline = !className;
      const rawCode = String(children).replace(/\n$/, '');
      const snippetId = `${T.snippetPrefix}${rawCode.slice(0, 15)}`;

      if (isInline) {
        return (
          <code className={T.codeInline} {...props}>
            {children}
          </code>
        );
      }
      return (
        <div className={`my-2.5 rounded-xl bg-surface-base border ${T.codeBlockBorder} overflow-hidden font-mono text-micro shadow-sm ${T.codeBlockExtra}`}>
          <div className="bg-surface-raised/90 px-3 py-1.5 border-b border-edge-raised text-micro text-text-muted font-semibold uppercase tracking-wider flex items-center justify-between">
            <span className="text-text-muted">Code Snippet</span>
            <button
              onClick={() => onCopy(rawCode, snippetId)}
              className="flex items-center gap-1 text-micro text-text-muted hover:text-primary transition-colors cursor-pointer"
            >
              {copiedCodeId === snippetId ? (
                <>
                  <Check className="w-3 h-3 text-primary" />
                  <span className="text-primary">Copied</span>
                </>
              ) : (
                <>
                  <Code2 className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 overflow-x-auto text-text-secondary leading-relaxed">
            <code>{children}</code>
          </pre>
        </div>
      );
    },
    table: ({ children }: any) => (
      <div className={`overflow-x-auto ${T.tableWrap}`}>
        <table className={`min-w-full text-caption text-left ${T.tableText}`}>{children}</table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className={T.thCell}>
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className={T.tdCell}>{children}</td>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className={`border-l-2 ${T.blockquoteBorder} pl-3 my-2 ${T.blockquoteText} italic text-caption`}>
        {children}
      </blockquote>
    ),
    hr: () => <hr className={`${T.hrMy} ${T.hrBorder}`} />,
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={T.linkClass}
        {...props}
      >
        {children}
      </a>
    ),
  };

  const components: Record<string, (props: any) => React.ReactNode> = { ...sharedComponents };

  if (T.emEl) {
    components.em = T.emEl;
  }

  return components;
}

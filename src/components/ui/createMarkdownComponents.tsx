'use client';

import React from 'react';
import CodeSnippetBlock from './CodeSnippetBlock';

export type MarkdownVariant = 'assistant' | 'user' | 'thought' | 'canvas';

interface MarkdownVariantStyles {
  h1: string;
  h2: string;
  h3: string;
  p: string;
  ul: string;
  ol: string;
  strong: string;
  codeInline: string;
  codeBlockBorder: string;
  codeBlockExtra: string;
  tableWrap: string;
  table: string;
  th: string;
  td: string;
  blockquote: string;
  hr: string;
  a: string;
  em?: (({ children }: any) => React.ReactNode) | null;
}

const BASE_STYLES: MarkdownVariantStyles = {
  h1: 'text-title font-display font-bold text-text-bright mt-3 mb-2 border-b border-edge-raised/80 pb-1.5 flex items-center gap-2',
  h2: 'text-heading font-display font-bold text-primary/90 mt-3 mb-1.5 tracking-wide',
  h3: 'text-subheading font-semibold text-text-primary mt-2 mb-1',
  p: 'text-body mb-2.5 leading-relaxed last:mb-0',
  ul: 'list-disc list-inside space-y-1.5 mb-3 text-text-secondary',
  ol: 'list-decimal list-inside space-y-1.5 mb-3 text-text-secondary',
  strong: 'font-semibold text-text-bright',
  codeInline: 'bg-surface-elevated/90 text-primary font-mono px-1.5 py-0.5 rounded text-micro',
  codeBlockBorder: 'border-edge-raised/80',
  codeBlockExtra: '',
  tableWrap: 'my-3 rounded-xl border border-edge-raised/80 bg-surface-base/40',
  table: 'min-w-full text-caption text-left text-text-secondary',
  th: 'bg-surface-elevated/70 px-3 py-2 border-b border-edge-raised font-semibold text-text-primary',
  td: 'px-3 py-2 border-b border-edge-raised/40 hover:bg-surface-hover/20',
  blockquote: 'border-l-2 border-primary/60 pl-3 my-2 text-text-muted italic text-caption',
  hr: 'my-3.5 border-edge-raised',
  a: 'text-primary underline decoration-primary/50 hover:decoration-primary font-medium transition-colors',
  em: null,
};

const VARIANT_STYLES: Record<MarkdownVariant, MarkdownVariantStyles> = {
  assistant: BASE_STYLES,

  canvas: {
    ...BASE_STYLES,
    h1: 'text-title font-display font-bold text-text-bright tracking-tight mt-4 mb-3 border-b border-edge-raised pb-2 flex items-center gap-2',
    h2: 'text-heading font-display font-bold text-primary/90 tracking-wide mt-6 mb-2',
    h3: 'text-subheading font-semibold text-text-primary mt-3 mb-1',
    p: 'text-body mb-2.5 leading-relaxed last:mb-0 text-text-secondary',
    ul: 'list-disc list-inside space-y-1.5 my-2 text-text-secondary',
    ol: 'list-decimal list-inside space-y-1.5 my-2 text-text-secondary',
    hr: 'my-4 border-edge-raised',
    em: ({ children }: any) => <em className="text-text-muted not-italic text-caption">{children}</em>,
  },

  user: {
    ...BASE_STYLES,
    h1: 'text-title font-display font-bold text-surface mt-2 mb-1.5 border-b border-surface/30 pb-1 flex items-center gap-2',
    h2: 'text-heading font-display font-bold text-surface mt-2 mb-1 tracking-wide',
    h3: 'text-subheading font-semibold text-surface mt-1.5 mb-0.5',
    p: 'text-body mb-2 leading-relaxed last:mb-0 text-surface',
    ul: 'list-disc list-inside space-y-1 my-1.5 text-surface/95',
    ol: 'list-decimal list-inside space-y-1 my-1.5 text-surface/95',
    strong: 'font-semibold text-surface',
    codeInline: 'bg-surface/20 text-surface font-mono px-1.5 py-0.5 rounded text-micro',
    codeBlockExtra: 'text-text-primary text-left',
    tableWrap: 'my-2.5 rounded-xl border border-surface/30 bg-surface/10',
    table: 'min-w-full text-caption text-left text-surface',
    th: 'bg-surface/20 px-3 py-1.5 border-b border-surface/30 font-semibold text-surface',
    td: 'px-3 py-1.5 border-b border-surface/20 hover:bg-surface/15',
    blockquote: 'border-l-2 border-surface/60 pl-3 my-2 text-surface/90 italic text-caption',
    hr: 'my-3 border-surface/30',
    a: 'underline decoration-surface/60 hover:decoration-surface transition-colors font-medium text-surface',
    em: ({ children }: any) => <em className="italic text-surface/90">{children}</em>,
  },

  thought: {
    ...BASE_STYLES,
    h1: 'text-subheading font-bold text-text-primary mt-2 mb-1 border-b border-edge-raised/50 pb-1 flex items-center gap-2',
    h2: 'text-label font-bold text-text-primary mt-2 mb-1 tracking-wide',
    h3: 'text-caption font-semibold text-text-primary mt-1.5 mb-0.5',
    p: 'text-body mb-2 leading-relaxed last:mb-0 text-text-secondary',
    ul: 'list-disc list-inside space-y-1 mb-2 text-text-muted',
    ol: 'list-decimal list-inside space-y-1 mb-2 text-text-muted',
    strong: 'font-semibold text-info',
    codeInline: 'bg-surface-raised text-info font-mono px-1 py-0.5 rounded text-micro',
    codeBlockBorder: 'border-edge-raised/60',
    tableWrap: 'my-2 rounded-lg border border-edge-raised bg-surface-base/30',
    table: 'min-w-full text-caption text-left text-text-secondary text-micro',
    th: 'bg-surface-elevated/60 px-2 py-1 border-b border-edge-raised font-semibold text-text-primary',
    td: 'px-2 py-1 border-b border-edge-raised/30',
    blockquote: 'border-l-2 border-edge-raised pl-3 my-2 text-text-muted text-caption italic',
    hr: 'my-2 border-edge-raised',
    a: 'text-info underline decoration-info/50 hover:decoration-info font-medium transition-colors',
  },
};

function buildMarkdownComponents(
  variant: MarkdownVariant = 'assistant',
  enableSnippetCopy = false,
) {
  const S = VARIANT_STYLES[variant];

  const components: Record<string, (props: any) => React.ReactNode> = {
    h1: ({ children }: any) => <h1 className={S.h1}>{children}</h1>,
    h2: ({ children }: any) => <h2 className={S.h2}>{children}</h2>,
    h3: ({ children }: any) => <h3 className={S.h3}>{children}</h3>,
    p: ({ children }: any) => <p className={S.p}>{children}</p>,
    ul: ({ children }: any) => <ul className={S.ul}>{children}</ul>,
    ol: ({ children }: any) => <ol className={S.ol}>{children}</ol>,
    li: ({ children }: any) => <li className="text-body leading-relaxed">{children}</li>,
    strong: ({ children }: any) => <strong className={S.strong}>{children}</strong>,
    code: ({ className, children, ...props }: any) => {
      if (!className) {
        return (
          <code className={S.codeInline} {...props}>
            {children}
          </code>
        );
      }

      const rawCode = String(children).replace(/\n$/, '');
      const match = /language-(\w+)/.exec(className || '');
      const rawLang = match ? match[1] : '';

      return (
        <CodeSnippetBlock
          rawCode={rawCode}
          rawLang={rawLang}
          className={className}
          borderClass={S.codeBlockBorder}
          extraClass={S.codeBlockExtra}
          enableCopy={enableSnippetCopy}
        />
      );
    },
    table: ({ children }: any) => (
      <div className={`overflow-x-auto ${S.tableWrap}`}>
        <table className={S.table}>{children}</table>
      </div>
    ),
    th: ({ children }: any) => <th className={S.th}>{children}</th>,
    td: ({ children }: any) => <td className={S.td}>{children}</td>,
    blockquote: ({ children }: any) => <blockquote className={S.blockquote}>{children}</blockquote>,
    hr: () => <hr className={S.hr} />,
    a: ({ href, children, ...props }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={S.a} {...props}>
        {children}
      </a>
    ),
  };

  if (S.em) {
    components.em = S.em;
  }

  return components;
}

const COMPONENTS_CACHE = new Map<string, Record<string, (props: any) => React.ReactNode>>();

/**
 * Returns a statically cached, immutable ReactMarkdown components dictionary.
 * Reuses stable object references per variant to avoid DOM node thrashing during streaming.
 */
export function getMarkdownComponents(
  variant: MarkdownVariant = 'assistant',
  enableSnippetCopy = false,
) {
  const cacheKey = `${variant}:${enableSnippetCopy}`;
  let cached = COMPONENTS_CACHE.get(cacheKey);
  if (!cached) {
    cached = buildMarkdownComponents(variant, enableSnippetCopy);
    COMPONENTS_CACHE.set(cacheKey, cached);
  }
  return cached;
}

/** Backwards-compatible alias for existing callers. */
export function createMarkdownComponents(
  variant: MarkdownVariant = 'assistant',
  _copiedCodeId?: string | null,
  _onCopy?: (code: string, id: string) => void,
) {
  return getMarkdownComponents(variant, Boolean(_onCopy));
}

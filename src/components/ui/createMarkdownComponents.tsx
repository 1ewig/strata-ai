'use client';

import React, { createContext, useContext } from 'react';
import { ExternalLink } from 'lucide-react';
import CodeSnippetBlock from './CodeSnippetBlock';

export type MarkdownVariant = 'assistant' | 'user' | 'thought' | 'canvas';

/**
 * Whitelist safe URL protocols for markdown links.
 * Strictly permits https://, http://, and mailto: to neutralize javascript: and data: XSS payloads.
 */
function sanitizeHref(rawHref?: string): string | undefined {
  if (!rawHref) return undefined;
  const trimmed = rawHref.trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

const InsidePreContext = createContext<boolean>(false);

interface MarkdownVariantStyles {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  p: string;
  ul: string;
  ol: string;
  li: string;
  strong: string;
  del: string;
  codeInline: string;
  codeBlockBorder: string;
  codeBlockExtra: string;
  tableWrap: string;
  table: string;
  thead: string;
  tbody: string;
  tr: string;
  th: string;
  td: string;
  blockquote: string;
  hr: string;
  a: string;
  checkbox: string;
  em?: (({ children }: any) => React.ReactNode) | null;
}

const BASE_STYLES: MarkdownVariantStyles = {
  h1: 'text-title font-display font-bold text-text-bright mt-3 mb-2 border-b border-edge-raised/80 pb-1.5 flex items-center gap-2',
  h2: 'text-heading font-display font-bold text-primary/90 mt-3 mb-1.5 tracking-wide',
  h3: 'text-subheading font-semibold text-text-primary mt-2 mb-1',
  h4: 'text-caption font-bold uppercase tracking-wider text-text-muted mt-2 mb-1',
  p: 'text-body mb-2.5 leading-relaxed last:mb-0',
  ul: 'list-disc list-outside pl-4 space-y-1.5 mb-3 text-text-secondary',
  ol: 'list-decimal list-outside pl-4 space-y-1.5 mb-3 text-text-secondary',
  li: 'text-body leading-relaxed pl-0.5',
  strong: 'font-semibold text-text-bright',
  del: 'line-through text-text-muted opacity-80',
  codeInline: 'bg-surface-elevated/90 text-primary font-mono px-1.5 py-0.5 rounded text-micro border border-edge-raised/50 select-all align-baseline',
  codeBlockBorder: 'border-edge-raised/80',
  codeBlockExtra: '',
  tableWrap: 'my-3 rounded-xl border border-edge-raised/80 bg-surface-base/40 overflow-x-auto shadow-card',
  table: 'min-w-full text-caption text-left text-text-secondary border-collapse',
  thead: 'bg-surface-elevated/70 text-text-secondary border-b border-edge-raised select-none',
  tbody: 'divide-y divide-edge-raised/40 text-text-primary',
  tr: 'hover:bg-surface-hover/20 transition-colors',
  th: 'px-3 py-2 font-semibold text-text-primary text-xs uppercase tracking-wider',
  td: 'px-3 py-2 align-middle text-text-secondary',
  blockquote: 'border-l-2 border-primary/60 pl-3 my-2 text-text-muted italic text-caption bg-surface-elevated/30 py-1.5 rounded-r-lg',
  hr: 'my-3.5 border-edge-raised',
  a: 'text-primary underline decoration-primary/50 hover:decoration-primary font-medium transition-colors',
  checkbox: 'size-3.5 rounded border-edge-raised text-primary accent-primary mr-1.5 align-middle pointer-events-none',
  em: null,
};

const VARIANT_STYLES: Record<MarkdownVariant, MarkdownVariantStyles> = {
  assistant: BASE_STYLES,

  canvas: {
    ...BASE_STYLES,
    h1: 'text-title font-display font-bold text-text-bright tracking-tight mt-4 mb-3 border-b border-edge-raised pb-2 flex items-center gap-2',
    h2: 'text-heading font-display font-bold text-primary/90 tracking-wide mt-6 mb-2',
    h3: 'text-subheading font-semibold text-text-primary mt-3 mb-1',
    h4: 'text-caption font-bold uppercase tracking-wider text-text-muted mt-3 mb-1',
    p: 'text-body mb-2.5 leading-relaxed last:mb-0 text-text-secondary',
    ul: 'list-disc list-outside pl-4 space-y-1.5 my-2 text-text-secondary',
    ol: 'list-decimal list-outside pl-4 space-y-1.5 my-2 text-text-secondary',
    hr: 'my-4 border-edge-raised',
    em: ({ children }: any) => <em className="text-text-muted not-italic text-caption">{children}</em>,
  },

  user: {
    ...BASE_STYLES,
    h1: 'text-title font-display font-bold text-surface mt-2 mb-1.5 border-b border-surface/30 pb-1 flex items-center gap-2',
    h2: 'text-heading font-display font-bold text-surface mt-2 mb-1 tracking-wide',
    h3: 'text-subheading font-semibold text-surface mt-1.5 mb-0.5',
    h4: 'text-caption font-bold uppercase tracking-wider text-surface/80 mt-1.5 mb-0.5',
    p: 'text-body mb-2 leading-relaxed last:mb-0 text-surface',
    ul: 'list-disc list-outside pl-4 space-y-1 my-1.5 text-surface/95',
    ol: 'list-decimal list-outside pl-4 space-y-1 my-1.5 text-surface/95',
    strong: 'font-semibold text-surface',
    del: 'line-through text-surface/70 opacity-80',
    codeInline: 'bg-surface/20 text-surface font-mono px-1.5 py-0.5 rounded text-micro',
    codeBlockExtra: 'text-text-primary text-left',
    tableWrap: 'my-2.5 rounded-xl border border-surface/30 bg-surface/10 overflow-x-auto',
    table: 'min-w-full text-caption text-left text-surface border-collapse',
    thead: 'bg-surface/20 text-surface border-b border-surface/30 select-none',
    tbody: 'divide-y divide-surface/20 text-surface',
    tr: 'hover:bg-surface/15 transition-colors',
    th: 'bg-surface/20 px-3 py-1.5 border-b border-surface/30 font-semibold text-surface text-xs uppercase tracking-wider',
    td: 'px-3 py-1.5 align-middle text-surface',
    blockquote: 'border-l-2 border-surface/60 pl-3 my-2 text-surface/90 italic text-caption',
    hr: 'my-3 border-surface/30',
    a: 'underline decoration-surface/60 hover:decoration-surface transition-colors font-medium text-surface',
    checkbox: 'size-3.5 rounded border-surface/40 text-surface accent-surface mr-1.5 align-middle pointer-events-none',
    em: ({ children }: any) => <em className="italic text-surface/90">{children}</em>,
  },

  thought: {
    ...BASE_STYLES,
    h1: 'text-subheading font-bold text-text-primary mt-2 mb-1 border-b border-edge-raised/50 pb-1 flex items-center gap-2',
    h2: 'text-label font-bold text-text-primary mt-2 mb-1 tracking-wide',
    h3: 'text-caption font-semibold text-text-primary mt-1.5 mb-0.5',
    h4: 'text-micro font-bold uppercase tracking-wider text-text-muted mt-1 mb-0.5',
    p: 'text-body mb-2 leading-relaxed last:mb-0 text-text-secondary',
    ul: 'list-disc list-outside pl-4 space-y-1 mb-2 text-text-muted',
    ol: 'list-decimal list-outside pl-4 space-y-1 mb-2 text-text-muted',
    strong: 'font-semibold text-info',
    del: 'line-through text-text-muted opacity-70',
    codeInline: 'bg-surface-raised text-info font-mono px-1 py-0.5 rounded text-micro',
    codeBlockBorder: 'border-edge-raised/60',
    tableWrap: 'my-2 rounded-lg border border-edge-raised bg-surface-base/30 overflow-x-auto',
    table: 'min-w-full text-caption text-left text-text-secondary text-micro border-collapse',
    thead: 'bg-surface-elevated/60 text-text-muted border-b border-edge-raised select-none',
    tbody: 'divide-y divide-edge-raised/30 text-text-secondary',
    tr: 'hover:bg-surface-elevated/20 transition-colors',
    th: 'bg-surface-elevated/60 px-2 py-1 border-b border-edge-raised font-semibold text-text-primary text-micro uppercase tracking-wider',
    td: 'px-2 py-1 align-middle border-b border-edge-raised/30',
    blockquote: 'border-l-2 border-edge-raised pl-3 my-2 text-text-muted text-caption italic',
    hr: 'my-2 border-edge-raised',
    a: 'text-info underline decoration-info/50 hover:decoration-info font-medium transition-colors',
    checkbox: 'size-3 rounded border-edge-raised text-info accent-info mr-1 align-middle pointer-events-none',
  },
};

function buildMarkdownComponents(
  variant: MarkdownVariant = 'assistant',
  enableSnippetCopy = true,
) {
  const S = VARIANT_STYLES[variant];

  const components: Record<string, (props: any) => React.ReactNode> = {
    h1: ({ children }: any) => <h1 className={S.h1}>{children}</h1>,
    h2: ({ children }: any) => <h2 className={S.h2}>{children}</h2>,
    h3: ({ children }: any) => <h3 className={S.h3}>{children}</h3>,
    h4: ({ children }: any) => <h4 className={S.h4}>{children}</h4>,
    p: ({ children }: any) => <p className={S.p}>{children}</p>,
    ul: ({ children }: any) => <ul className={S.ul}>{children}</ul>,
    ol: ({ children }: any) => <ol className={S.ol}>{children}</ol>,
    li: ({ children }: any) => <li className={S.li}>{children}</li>,
    strong: ({ children }: any) => <strong className={S.strong}>{children}</strong>,
    del: ({ children }: any) => <del className={S.del}>{children}</del>,
    input: ({ type, checked, ...props }: any) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={Boolean(checked)}
            readOnly
            className={S.checkbox}
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    },
    pre: ({ children }: any) => {
      let codeString = '';
      let language = '';

      if (React.isValidElement(children)) {
        const codeProps = (children as any).props as { className?: string; children?: React.ReactNode };
        language = (codeProps?.className || '').replace(/language-/, '').trim();
        const raw = codeProps?.children;
        if (typeof raw === 'string') {
          codeString = raw;
        } else if (Array.isArray(raw)) {
          codeString = raw.map((item) => (typeof item === 'string' ? item : '')).join('');
        }
      }

      return (
        <InsidePreContext.Provider value={true}>
          <CodeSnippetBlock
            rawCode={codeString.replace(/\n$/, '')}
            rawLang={language}
            className=""
            borderClass={S.codeBlockBorder}
            extraClass={S.codeBlockExtra}
            enableCopy={enableSnippetCopy}
          >
            {children}
          </CodeSnippetBlock>
        </InsidePreContext.Provider>
      );
    },
    code: ({ className, children, ...props }: any) => {
      const isInsidePre = useContext(InsidePreContext);
      if (isInsidePre) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }

      if (className && /language-(\w+)/.test(className)) {
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
      }

      return (
        <code className={S.codeInline} {...props}>
          {children}
        </code>
      );
    },
    table: ({ children }: any) => (
      <div className={S.tableWrap}>
        <table className={S.table}>{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className={S.thead}>{children}</thead>,
    tbody: ({ children }: any) => <tbody className={S.tbody}>{children}</tbody>,
    tr: ({ children }: any) => <tr className={S.tr}>{children}</tr>,
    th: ({ children }: any) => <th className={S.th}>{children}</th>,
    td: ({ children }: any) => <td className={S.td}>{children}</td>,
    blockquote: ({ children }: any) => <blockquote className={S.blockquote}>{children}</blockquote>,
    hr: () => <hr className={S.hr} />,
    a: ({ href, children, ...props }: any) => {
      const safeHref = sanitizeHref(href);
      if (!safeHref) {
        return (
          <span
            className="text-text-muted underline decoration-dotted cursor-not-allowed inline break-all [overflow-wrap:anywhere]"
            title="Link disabled for security (unsupported protocol)"
          >
            {children}
          </span>
        );
      }
      return (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${S.a} inline-flex items-center gap-0.5 break-all [overflow-wrap:anywhere]`}
          {...props}
        >
          <span>{children}</span>
          <ExternalLink className="w-3 h-3 inline-block ml-0.5 opacity-70 shrink-0 align-baseline" />
        </a>
      );
    },
  };

  if (S.em) {
    components.em = S.em;
  }

  return components;
}

const COMPONENTS_CACHE = new Map<string, Record<string, (props: any) => React.ReactNode>>();

/**
 * Returns a statically cached, immutable Streamdown components dictionary.
 * Reuses stable object references per variant to avoid DOM node thrashing during streaming.
 */
export function getMarkdownComponents(
  variant: MarkdownVariant = 'assistant',
  enableSnippetCopy = true,
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

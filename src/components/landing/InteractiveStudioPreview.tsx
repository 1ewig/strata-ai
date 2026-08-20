'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Copy,
  Check,
  Eye,
  Code,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import {
  fadeUpVariants,
  viewportOnce,
} from './animations';

const SHOWCASE_DOCUMENT = {
  userMessage:
    'I want to start an invite-only circle for writers and designers. Can you shape my scattered notes into a clean manifesto and weekly ritual guide?',
  toolCall: 'writeFile("community-manifesto.md")',
  agentResponse:
    "I've organized your vision into three foundational convictions and an intimate weekly cadence.",
  fileName: 'community-manifesto.md',
  language: 'Markdown',
  charCount: 1080,
  content: `## Core Convictions

- **Depth over Velocity:** We celebrate finished, thoughtful pieces rather than hurried hot takes.
- **Asynchronous Stillness:** No noisy notifications. Every conversation has room to breathe.
- **Radical Generosity:** Critique is offered with care, kindness, and specific attention.

### Weekly Rituals

1. **Monday Sparks (09:00):** Post one creative focus for your week.
2. **Wednesday Work-in-Progress:** Share an unfinished paragraph or sketch for gentle feedback.
3. **Friday Solstice:** Celebrate whatever got completed — even a single good sentence.`,
};

/**
 * Realistic, tactile studio preview showcasing how Strata AI pairs
 * conversational agentic assistance with a live, rendered workspace canvas.
 */
export function InteractiveStudioPreview() {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SHOWCASE_DOCUMENT.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="canvas" className="py-12 md:py-16">
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-5xl mx-auto px-4 sm:px-6"
      >
        {/* Studio Window Mock */}
        <div className="bg-surface-raised border border-edge-raised rounded-3xl shadow-card-lg overflow-hidden">
          {/* Top Window Bar */}
          <div className="h-12 px-4 sm:px-6 border-b border-edge-default bg-surface-elevated/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-danger/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-accent-olive/70" />
              <span className="ml-2 font-mono text-micro text-text-muted hidden sm:inline-block">
                strata.studio • Creative Strategy
              </span>
            </div>

            <div className="flex items-center gap-1 text-micro text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-olive animate-pulse" />
              <span>Live Agent & Canvas</span>
            </div>
          </div>

          {/* Two-Pane Studio Surface */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
            {/* Left Pane: Conversational Stream (5 cols) */}
            <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-edge-default p-5 sm:p-6 bg-surface-base/40 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-micro text-text-muted uppercase tracking-wider font-semibold">
                  <span>Chat Stream</span>
                  <span className="font-mono text-primary font-normal">Step 1/1</span>
                </div>

                {/* User Bubble */}
                <div className="flex flex-col items-end space-y-1">
                  <div className="bg-primary text-surface p-3.5 sm:p-4 rounded-2xl rounded-tr-xs text-body shadow-button leading-relaxed max-w-[95%]">
                    {SHOWCASE_DOCUMENT.userMessage}
                  </div>
                  <span className="text-micro text-text-muted pr-1">You</span>
                </div>

                {/* Assistant Turn */}
                <div className="flex items-start gap-3 max-w-[98%] pt-1">
                  <div className="w-7 h-7 rounded-xl bg-surface-raised border border-edge-raised flex items-center justify-center shadow-button shrink-0 mt-0.5">
                    <StrataIcon className="w-4 h-4" />
                  </div>

                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Tool Execution Card */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-raised border border-edge-raised text-micro font-mono text-text-secondary shadow-button">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent-olive shrink-0" />
                      <span className="truncate">{SHOWCASE_DOCUMENT.toolCall}</span>
                    </div>

                    {/* Assistant Text */}
                    <div className="bg-surface-raised border border-edge-raised p-3.5 rounded-2xl rounded-tl-xs text-body text-text-primary shadow-card leading-relaxed">
                      {SHOWCASE_DOCUMENT.agentResponse}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-edge-default flex items-center justify-between text-caption text-text-muted">
                <span>Surgical file operations</span>
                <span className="text-primary font-medium flex items-center gap-0.5">
                  Synced <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Right Pane: The Rendered Workspace Canvas (7 cols) */}
            <div className="lg:col-span-7 bg-surface-raised p-5 sm:p-6 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Canvas Toolbar: File Tab + View Toggle + Copy (Dividers Removed) */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Active File Tab */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-edge-raised text-label font-medium text-text-bright shadow-sm">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span className="font-mono text-caption font-semibold">
                        {SHOWCASE_DOCUMENT.fileName}
                      </span>
                    </div>
                  </div>

                  {/* View Controls: Preview / Source Toggle & Copy Button */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-surface-base border border-edge-raised rounded-lg p-0.5 text-caption">
                      <button
                        type="button"
                        onClick={() => setViewMode('preview')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-caption font-medium transition-all cursor-pointer ${
                          viewMode === 'preview'
                            ? 'bg-surface-raised text-primary shadow-sm font-semibold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                        title="Rendered Markdown Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('source')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-caption font-medium transition-all cursor-pointer ${
                          viewMode === 'source'
                            ? 'bg-surface-raised text-primary shadow-sm font-semibold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                        title="Raw Markdown Source"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>Source</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopy}
                      title="Copy document content"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-elevated border border-edge-default text-caption text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-accent-olive" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Canvas Document Content: Rendered Markdown vs Source */}
                <div className="bg-surface-base/50 rounded-2xl p-5 overflow-y-auto max-h-[320px] transition-colors">
                  {viewMode === 'preview' ? (
                    <article className="text-body text-text-primary leading-relaxed">
                      <MarkdownRenderer
                        content={SHOWCASE_DOCUMENT.content}
                        variant="canvas"
                        className="text-body text-text-primary leading-relaxed"
                      />
                    </article>
                  ) : (
                    <pre className="font-mono text-caption text-text-primary whitespace-pre-wrap leading-relaxed">
                      {SHOWCASE_DOCUMENT.content}
                    </pre>
                  )}
                </div>
              </div>

              {/* Canvas Status Footer (Dividers Removed) */}
              <div className="pt-2 flex items-center justify-between text-caption text-text-muted">
                <span>{SHOWCASE_DOCUMENT.charCount} chars • {SHOWCASE_DOCUMENT.language}</span>
                <span className="text-accent-olive font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-olive" />
                  Auto-saved in browser
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

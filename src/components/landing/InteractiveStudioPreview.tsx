'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Copy,
  Check,
  Sparkles,
  Feather,
  Compass,
  Eye,
  Code,
  CheckCircle2,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import {
  fadeUpVariants,
  viewportOnce,
  scenarioContentVariants,
  buttonHoverProps,
} from './animations';

interface Scenario {
  id: string;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  userMessage: string;
  agentResponse: string;
  toolCall: string;
  fileName: string;
  language: string;
  charCount: number;
  content: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'manifesto',
    label: 'Community Manifesto',
    category: 'Creative Strategy',
    icon: Sparkles,
    userMessage:
      'I want to start an invite-only circle for writers and designers. Can you shape my scattered notes into a clean manifesto and weekly ritual guide?',
    toolCall: 'writeFile("community-manifesto.md")',
    agentResponse:
      "I've organized your vision into three foundational convictions and an intimate weekly cadence.",
    fileName: 'community-manifesto.md',
    language: 'Markdown',
    charCount: 1120,
    content: `## Core Convictions

- **Depth over Velocity:** We celebrate finished, thoughtful pieces rather than hurried hot takes.
- **Asynchronous Stillness:** No noisy notifications. Every conversation has room to breathe.
- **Radical Generosity:** Critique is offered with care, kindness, and specific attention.

---

### Weekly Rituals

1. **Monday Sparks (09:00):** Post one creative focus for your week.
2. **Wednesday Work-in-Progress:** Share an unfinished paragraph or sketch for gentle feedback.
3. **Friday Solstice:** Celebrate whatever got completed — even a single good sentence.`,
  },
  {
    id: 'essay',
    label: 'Refining Essays',
    category: 'Long-form Prose',
    icon: Feather,
    userMessage:
      'Here is the opening of my essay on digital solitude. Help me sharpen the hook and tighten the second paragraph without losing my voice.',
    toolCall: 'editFile("the-quiet-room.md")',
    agentResponse:
      'I made a surgical edit to replace the passive opening with a vivid visual anchor, preserving your reflective rhythm.',
    fileName: 'the-quiet-room.md',
    language: 'Markdown',
    charCount: 980,
    content: `> *"We do not lack information; we lack the quiet rooms in which information turns into understanding."*

### The Architecture of Solitude

Modern interfaces are engineered for continuous capture. Every tab is an open door, every notification a tap on the shoulder. When every moment is filled with the voices of thousands, our inner monologue is the first thing to dissolve.

### Reclaiming Stillness

Solitude is not isolation; it is the deliberate choice to close the door long enough to hear yourself think. In a quiet workspace, a single idea can finally unfold to its natural conclusion.`,
  },
  {
    id: 'spec',
    label: 'Architecture Blueprint',
    category: 'Technical Spec',
    icon: Compass,
    userMessage:
      'Outline our local-first storage design. Emphasize offline resilience, sub-5ms boot times, and total user data sovereignty.',
    toolCall: 'writeFile("storage-architecture.md")',
    agentResponse:
      'Drafted the three-tier local architecture detailing IndexedDB persistence, in-memory state, and the export pipeline.',
    fileName: 'storage-architecture.md',
    language: 'Markdown',
    charCount: 1240,
    content: `### System Invariants

- **Instant Local Boot:** All reads and writes hit IndexedDB first with zero network dependency.
- **Graceful Offline Mode:** Full drafting, organizing, and markdown rendering without internet.
- **Data Sovereignty:** Documents remain entirely in the browser unless explicitly exported.

---

### Storage Hierarchy

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Persistence** | IndexedDB (Dexie v5) | Durable workspace files & message history |
| **Active Canvas** | In-Memory Reactive State | Instant lag-free editing & preview |
| **Transport** | Snapshot Exporter | Plain-text and Markdown file export |`,
  },
];

/**
 * Realistic, tactile studio preview showcasing how Strata AI pairs
 * conversational agentic assistance with a live, rendered workspace canvas.
 */
export function InteractiveStudioPreview() {
  const [activeScenario, setActiveScenario] = useState<Scenario>(SCENARIOS[0]);
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeScenario.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="canvas" className="py-16 md:py-24">
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6"
      >
        {/* Scenario Selection Pills */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-edge-default">
          <div className="flex items-center gap-2 text-text-secondary text-caption font-medium">
            <Layers className="w-4 h-4 text-primary" />
            <span>Interactive Studio Session</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {SCENARIOS.map((scenario) => {
              const Icon = scenario.icon;
              const isActive = activeScenario.id === scenario.id;
              return (
                <motion.button
                  key={scenario.id}
                  type="button"
                  {...buttonHoverProps}
                  onClick={() => setActiveScenario(scenario)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-caption font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-surface-raised border border-primary/40 text-primary shadow-button'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                  <span>{scenario.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Studio Window Mock */}
        <div className="bg-surface-raised border border-edge-raised rounded-3xl shadow-card-lg overflow-hidden">
          {/* Top Window Bar */}
          <div className="h-12 px-4 sm:px-6 border-b border-edge-default bg-surface-elevated/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-danger/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-accent-olive/70" />
              <span className="ml-2 font-mono text-micro text-text-muted hidden sm:inline-block">
                strata.studio • {activeScenario.category}
              </span>
            </div>

            <div className="flex items-center gap-1 text-micro text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-olive animate-pulse" />
              <span>Live Agent & Canvas</span>
            </div>
          </div>

          {/* Two-Pane Studio Surface */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScenario.id}
              variants={scenarioContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]"
            >
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
                      {activeScenario.userMessage}
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
                        <span className="truncate">{activeScenario.toolCall}</span>
                      </div>

                      {/* Assistant Text */}
                      <div className="bg-surface-raised border border-edge-raised p-3.5 rounded-2xl rounded-tl-xs text-body text-text-primary shadow-card leading-relaxed">
                        {activeScenario.agentResponse}
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
                  {/* Canvas Toolbar: File Tab + View Toggle + Copy */}
                  <div className="flex items-center justify-between pb-3 border-b border-edge-default gap-3 flex-wrap">
                    {/* Active File Tab */}
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-edge-raised text-label font-medium text-text-bright shadow-sm">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono text-caption font-semibold">
                          {activeScenario.fileName}
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
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-base hover:bg-surface-elevated border border-edge-default text-caption text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
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
                  <div className="bg-surface-base/50 border border-edge-default rounded-2xl p-5 overflow-y-auto max-h-[320px] transition-colors">
                    {viewMode === 'preview' ? (
                      <article className="text-body text-text-primary leading-relaxed">
                        <MarkdownRenderer
                          content={activeScenario.content}
                          variant="canvas"
                          className="text-body text-text-primary leading-relaxed"
                        />
                      </article>
                    ) : (
                      <pre className="font-mono text-caption text-text-primary whitespace-pre-wrap leading-relaxed">
                        {activeScenario.content}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Canvas Status Footer */}
                <div className="pt-4 border-t border-edge-default flex items-center justify-between text-caption text-text-muted">
                  <span>{activeScenario.charCount} chars • {activeScenario.language}</span>
                  <span className="text-accent-olive font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-olive" />
                    Auto-saved in browser
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}

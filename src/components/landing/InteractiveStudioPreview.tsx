'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  PanelRightClose,
  Code2,
  BookOpen,
  Feather,
} from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
import {
  fadeUpVariants,
  viewportOnce,
  scenarioContentVariants,
  buttonHoverProps,
} from './animations';

interface Scenario {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  userPrompt: string;
  assistantSummary: string;
  toolAction: string;
  fileName: string;
  fileLanguage: string;
  charCount: number;
  content: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'creative',
    label: 'Creative Strategy',
    icon: Sparkles,
    userPrompt:
      "I have some scattered thoughts about launching a quiet, invite-only community for designers and writers. Can you organize them into a clean 1-page manifesto and ritual guide?",
    assistantSummary:
      "I've distilled your core intentions into a living brief with clear community values, weekly quiet rituals, and an intimate invite cadence.",
    toolAction: 'writeFile("community-manifesto.md")',
    fileName: 'community-manifesto.md',
    fileLanguage: 'Markdown',
    charCount: 1420,
    content: `# The Quiet Guild: Founding Manifesto

A community designed for depth, unhurried craft, and mutual encouragement.

## Core Convictions
- **Depth over Velocity:** We celebrate finished, thoughtful pieces rather than endless hot takes.
- **Asynchronous Stillness:** No noisy pinging; every discussion has room to breathe.
- **Radical Generosity:** Critique is offered with care, kindness, and specific attention.

## Weekly Rituals
1. **Monday Sparks (09:00):** Share one goal for your creative focus this week.
2. **Wednesday Work-in-Progress:** Post an unfinished paragraph or sketch for gentle feedback.
3. **Friday Solstice:** Celebrate what got finished — even if it was just a single good sentence.

## Membership Cadence
- Maximum cohort size: 30 active members.
- Invitation model: Existing members nominate one thoughtful peer each quarter.`,
  },
  {
    id: 'writing',
    label: 'Refining Essays',
    icon: Feather,
    userPrompt:
      "Here is a draft of my essay intro on digital solitude. Help me sharpen the opening hook and tighten the second paragraph without losing my natural voice.",
    assistantSummary:
      "I made a surgical edit to replace the passive opening with a vivid visual anchor, preserving your reflective rhythm.",
    toolAction: 'editFile("digital-solitude.md")',
    fileName: 'digital-solitude.md',
    fileLanguage: 'Markdown',
    charCount: 1180,
    content: `# The Architecture of Solitude

We do not lack information; we lack the quiet rooms in which information turns into understanding.

## The Crowded Mind
Modern interfaces are engineered for continuous capture. Every tab is an open door, every notification a tap on the shoulder. When every moment is filled with the voices of thousands, our own inner monologue is the first thing to dissolve.

## Reclaiming Stillness
Solitude is not isolation; it is the deliberate choice to close the door long enough to hear yourself think. In a quiet workspace, a single idea can finally unfold to its natural conclusion.`,
  },
  {
    id: 'architecture',
    label: 'Project Blueprint',
    icon: BookOpen,
    userPrompt:
      "Let's outline our local-first sync strategy for the new document studio. Focus on privacy, offline reliability, and fast startup.",
    assistantSummary:
      "I drafted a clean architectural overview structuring the IndexedDB cache, optimistic updates, and background conflict resolution.",
    toolAction: 'writeFile("local-sync-blueprint.md")',
    fileName: 'local-sync-blueprint.md',
    fileLanguage: 'Markdown',
    charCount: 1650,
    content: `# Local-First Architecture Blueprint

A resilient, zero-latency document pipeline prioritizing user data sovereignty.

## Guiding Principles
- **Instant Local Boot:** All reads and writes hit browser storage first (<5ms).
- **Graceful Offline Mode:** Full editing, organizing, and markdown rendering without internet.
- **Privacy by Default:** Zero unsolicited telemetry; documents never leave the client without an explicit action.

## Storage Hierarchy
1. **IndexedDB (Primary Store):** Durable message logs and workspace files.
2. **Reactive Memory Layer:** Fast in-memory state for active workspace files.
3. **Snapshot Exporter:** Plain text and Markdown export at any point in the workflow.`,
  },
];

/**
 * Interactive preview demonstrating the natural dialogue and side-by-side living canvas.
 */
export function InteractiveStudioPreview() {
  const [activeScenario, setActiveScenario] = useState<Scenario>(SCENARIOS[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeScenario.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="preview" className="py-12 md:py-20">
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6"
      >
        {/* Section heading */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="font-display font-bold text-heading sm:text-title text-text-bright tracking-tight">
            A conversational partner with a living canvas.
          </h2>
          <p className="text-body text-text-secondary">
            You converse naturally. Strata turns the dialogue into durable, structured documents
            that stay visible and editable beside your thoughts.
          </p>
        </div>

        {/* Scenario switcher tabs */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            const isActive = activeScenario.id === scenario.id;
            return (
              <motion.button
                key={scenario.id}
                type="button"
                {...buttonHoverProps}
                onClick={() => setActiveScenario(scenario)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-label font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-surface-raised border border-primary/30 text-text-bright shadow-button text-primary'
                    : 'bg-surface-elevated/60 hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-edge-default'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                <span>{scenario.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Interactive Studio Workspace Window */}
        <div className="bg-surface-raised border border-edge-raised rounded-3xl shadow-card-lg overflow-hidden transition-all duration-200">
          {/* Top Window Chrome */}
          <div className="px-4 sm:px-6 py-3 border-b border-edge-default bg-surface-elevated/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-accent-olive/60" />
              <span className="ml-2 text-caption font-mono text-text-muted hidden sm:inline-block">
                strata.studio / active-session
              </span>
            </div>

            <div className="flex items-center gap-2 text-micro font-medium text-text-muted">
              <span className="w-2 h-2 rounded-full bg-accent-olive animate-pulse" />
              <span>Studio Live Canvas</span>
            </div>
          </div>

          {/* Side-by-side: Left Chat / Right Canvas */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScenario.id}
              variants={scenarioContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]"
            >
              {/* Left: Conversational Stream (5 cols) */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-edge-default p-5 sm:p-6 bg-surface-base/50 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="text-micro font-semibold uppercase tracking-wider text-text-muted">
                    Conversational Stream
                  </div>

                  {/* User Message Bubble */}
                  <div className="flex flex-col items-end space-y-1">
                    <div className="bg-primary text-surface p-3.5 rounded-2xl rounded-tr-sm text-body shadow-button max-w-[90%] font-normal">
                      {activeScenario.userPrompt}
                    </div>
                    <span className="text-micro text-text-muted pr-1">You • just now</span>
                  </div>

                  {/* Assistant Turn */}
                  <div className="flex items-start gap-3 max-w-[95%]">
                    <div className="w-7 h-7 rounded-xl bg-surface-raised border border-edge-raised flex items-center justify-center shadow-button shrink-0 mt-0.5">
                      <StrataIcon className="w-4 h-4" />
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {/* Tool Action Badge */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-raised border border-edge-raised text-micro font-mono text-text-secondary shadow-button">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-olive" />
                        <span>{activeScenario.toolAction}</span>
                      </div>

                      {/* Assistant Thought & Response */}
                      <div className="bg-surface-raised border border-edge-raised p-4 rounded-2xl rounded-tl-sm text-body text-text-primary shadow-card">
                        <p className="leading-relaxed">{activeScenario.assistantSummary}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat footer hint */}
                <div className="pt-4 border-t border-edge-default flex items-center justify-between text-caption text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-secondary" />
                    <span>Surgical file operations</span>
                  </div>
                  <span>25-step agent loop</span>
                </div>
              </div>

              {/* Right: Living Canvas / Workspace Drawer (7 cols) */}
              <div className="lg:col-span-7 bg-surface-raised p-5 sm:p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* File Header Tabs */}
                  <div className="flex items-center justify-between pb-3 border-b border-edge-default gap-2">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-edge-raised text-label font-medium text-text-bright">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span>{activeScenario.fileName}</span>
                      </div>
                      <span className="text-micro text-text-muted uppercase px-2 py-0.5 rounded bg-surface-base border border-edge-default font-mono">
                        {activeScenario.fileLanguage}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
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

                  {/* Document preview render */}
                  <div className="bg-surface-base/60 border border-edge-default rounded-2xl p-5 font-sans overflow-y-auto max-h-[340px] space-y-3">
                    <pre className="whitespace-pre-wrap font-sans text-body text-text-primary leading-relaxed">
                      {activeScenario.content}
                    </pre>
                  </div>
                </div>

                {/* Canvas footer metadata */}
                <div className="pt-4 mt-4 border-t border-edge-default flex items-center justify-between text-caption text-text-muted">
                  <span>{activeScenario.charCount.toLocaleString()} characters • auto-saved</span>
                  <div className="flex items-center gap-1.5 text-primary font-medium">
                    <PanelRightClose className="w-3.5 h-3.5" />
                    <span>Durable workspace</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}

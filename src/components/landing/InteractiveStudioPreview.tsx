'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Copy, Check, Sparkles, Feather, Compass } from 'lucide-react';
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
  prompt: string;
  fileName: string;
  charCount: number;
  content: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'manifesto',
    label: 'A Community Brief',
    icon: Sparkles,
    prompt:
      "I have some scattered thoughts about launching a quiet creative circle for writers. Can you organize them into an intimate 1-page guide?",
    fileName: 'community-brief.md',
    charCount: 940,
    content: `# The Quiet Guild

A space designed for unhurried craft, depth, and mutual encouragement.

## Three Intentions
- **Depth over Speed:** We celebrate finished, thoughtful pieces rather than hot takes.
- **Asynchronous Stillness:** No frantic pinging. Every discussion has room to breathe.
- **Radical Generosity:** Feedback is given with kindness, attention, and care.

## Weekly Cadence
- **Monday:** Share one piece of creative focus for the week.
- **Wednesday:** Post an unfinished paragraph for gentle feedback.
- **Friday:** Celebrate whatever was completed — even a single good sentence.`,
  },
  {
    id: 'essay',
    label: 'An Essay Draft',
    icon: Feather,
    prompt:
      "Here is the opening of my essay on creative focus. Help me tighten the second paragraph without losing my natural voice.",
    fileName: 'creative-focus.md',
    charCount: 810,
    content: `# The Quiet Room

We do not lack information; we lack the quiet rooms in which information turns into understanding.

## Reclaiming Stillness
When every open tab demands attention, our inner monologue is the first thing to dissolve. Solitude is not isolation — it is the deliberate choice to close the door long enough to hear yourself think.

In a quiet workspace, a single idea can finally unfold to its natural conclusion.`,
  },
  {
    id: 'blueprint',
    label: 'A Project Plan',
    icon: Compass,
    prompt:
      "Let's outline our local-first storage plan. Emphasize offline reliability, fast startup, and complete user privacy.",
    fileName: 'local-first-plan.md',
    charCount: 890,
    content: `# Local-First Architecture

A resilient document studio prioritizing user data sovereignty.

## Guiding Principles
- **Instant Boot:** All reads and writes hit local storage first (<5ms).
- **Graceful Offline Mode:** Full drafting and reading without internet access.
- **Zero Cloud Leakage:** Documents stay entirely in the browser unless exported.

## Data Hierarchy
1. **IndexedDB:** Persistent storage for living documents and history.
2. **Reactive Canvas:** In-memory state for instant, lag-free editing.`,
  },
];

/**
 * Interactive Living Sheet preview showing natural conversation beside living documents.
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
    <section id="canvas" className="py-12 md:py-20">
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6"
      >
        {/* Section title & scenario switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-edge-default">
          <div className="flex items-center gap-2">
            <StrataIcon className="w-4 h-4" />
            <span className="font-display font-semibold text-label text-text-bright">
              The Living Canvas
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {SCENARIOS.map((scenario) => {
              const Icon = scenario.icon;
              const isActive = activeScenario.id === scenario.id;
              return (
                <motion.button
                  key={scenario.id}
                  type="button"
                  {...buttonHoverProps}
                  onClick={() => setActiveScenario(scenario)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-caption font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-surface-raised border border-primary/30 text-text-bright shadow-button text-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                  <span>{scenario.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* The Living Sheet Container */}
        <div className="bg-surface-raised border border-edge-raised rounded-3xl shadow-card-lg overflow-hidden transition-all">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScenario.id}
              variants={scenarioContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]"
            >
              {/* Left Column: Natural Thought Dialogue (5 cols) */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-edge-default p-6 sm:p-7 bg-surface-base/40 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <span className="text-micro font-medium uppercase tracking-wider text-text-muted">
                    Your Words
                  </span>

                  <div className="bg-primary text-surface p-4 rounded-2xl rounded-tr-sm text-body shadow-button font-normal leading-relaxed">
                    {activeScenario.prompt}
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-caption text-text-muted">
                    <span className="w-2 h-2 rounded-full bg-accent-olive" />
                    <span>Living document shaped on canvas</span>
                  </div>
                </div>

                <div className="text-caption text-text-muted pt-4 border-t border-edge-default flex items-center justify-between">
                  <span>Side-by-side focus</span>
                  <span className="font-mono text-micro text-primary">Strata Canvas</span>
                </div>
              </div>

              {/* Right Column: The Structured Living Document (7 cols) */}
              <div className="lg:col-span-7 bg-surface-raised p-6 sm:p-7 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Document Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-edge-default">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-mono text-caption font-semibold text-text-bright">
                        {activeScenario.fileName}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopy}
                      title="Copy document content"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-elevated border border-edge-default text-caption text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
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

                  {/* Clean Document Prose */}
                  <div className="bg-surface-base/50 border border-edge-default rounded-2xl p-5 font-sans overflow-y-auto max-h-[300px]">
                    <pre className="whitespace-pre-wrap font-sans text-body text-text-primary leading-relaxed">
                      {activeScenario.content}
                    </pre>
                  </div>
                </div>

                {/* Document Footer */}
                <div className="pt-4 border-t border-edge-default flex items-center justify-between text-caption text-text-muted">
                  <span>{activeScenario.charCount} characters</span>
                  <span className="text-accent-olive font-medium">Saved to browser</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}

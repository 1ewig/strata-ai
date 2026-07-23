'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, FileText, Copy, Edit3, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Resume } from '@/lib/schemas';

interface ResumeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  resume?: Resume;
  onUpdateResume: (resume: Resume) => void;
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
}

export default function ResumeDrawer({
  isOpen,
  onClose,
  resume,
  onUpdateResume,
}: ResumeDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [markdownValue, setMarkdownValue] = useState(resume?.markdownContent || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMarkdownValue(resume?.markdownContent || '');
  }, [resume?.markdownContent]);

  if (!isOpen) return null;

  const currentResume: Resume = resume || {
    id: 'default',
    title: 'Chat Resume',
    markdownContent: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleSaveEdit = () => {
    onUpdateResume({
      ...currentResume,
      markdownContent: markdownValue,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(currentResume.markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl bg-zinc-900 border-l border-zinc-800 shadow-2xl h-full flex flex-col z-10"
        >
          {/* Header */}
          <div className="h-14 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-100">{currentResume.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              {currentResume.markdownContent && (
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                  title="Copy markdown"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}

              {isEditing ? (
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {isEditing ? (
              <textarea
                value={markdownValue}
                onChange={(e) => setMarkdownValue(e.target.value)}
                rows={28}
                placeholder="# Your Name&#10;your.email@example.com&#10;&#10;## Professional Summary..."
                className="w-full h-full min-h-[500px] bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/60 leading-relaxed resize-y"
              />
            ) : !currentResume.markdownContent ? (
              <div className="h-full flex flex-col items-center justify-center border border-dashed border-zinc-800/80 rounded-2xl p-8 text-center bg-zinc-950/20">
                <FileText className="w-10 h-10 text-zinc-600 mb-3" />
                <h4 className="text-zinc-300 font-semibold text-sm">No Resume Generated Yet</h4>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Paste your resume text in the chat or ask the AI: <br />
                  <span className="text-emerald-400 italic font-mono mt-1 inline-block">"Create a Markdown resume for a Senior Software Engineer"</span>
                </p>
              </div>
            ) : (
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-8 shadow-2xl text-zinc-100 selection:bg-emerald-500/30">
                <article className="prose prose-invert prose-emerald max-w-none space-y-4 text-xs leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight border-b border-zinc-800 pb-2 mb-3">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-sm font-bold text-emerald-400 tracking-wider uppercase border-b border-zinc-800/60 pb-1 mt-6 mb-2">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xs font-semibold text-zinc-200 mt-3 mb-1 flex items-center justify-between">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-xs text-zinc-300 leading-normal my-1">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-outside pl-4 space-y-1.5 my-2 text-xs text-zinc-300">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-xs text-zinc-300 leading-normal">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-zinc-100">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-zinc-400 not-italic text-[11px] float-right">
                          {children}
                        </em>
                      ),
                      hr: () => <hr className="border-zinc-800 my-4" />,
                    }}
                  >
                    {currentResume.markdownContent}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, FileText, Copy, Edit3, Eye, Check } from 'lucide-react';
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
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                Markdown
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentResume.markdownContent && (
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                  title="Copy markdown"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}

              {isEditing ? (
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
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
                className="w-full h-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/60 leading-relaxed resize-none"
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
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-6 shadow-inner text-zinc-200 text-xs font-sans leading-relaxed whitespace-pre-wrap select-text selection:bg-emerald-500/30">
                {currentResume.markdownContent}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

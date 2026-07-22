'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Sparkles, Plus, Edit2, FileText, Check } from 'lucide-react';
import { Resume, ResumeSection } from '@/lib/schemas';
import SectionItem from './SectionItem';
import { generateId } from '@/lib/id';

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
  onSendMessage,
  isLoading,
}: ResumeDrawerProps) {
  const [isEditingRaw, setIsEditingRaw] = useState(false);
  const [rawTextValue, setRawTextValue] = useState(resume?.rawText || '');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newType, setNewType] = useState('custom');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  if (!isOpen) return null;

  const currentResume: Resume = resume || {
    id: 'default',
    slug: 'default',
    title: 'Chat Resume',
    rawText: '',
    sections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleSaveRawText = () => {
    onUpdateResume({
      ...currentResume,
      rawText: rawTextValue,
      updatedAt: new Date().toISOString(),
    });
    setIsEditingRaw(false);
  };

  const handleUpdateSection = (sectionId: string, title?: string, content?: string) => {
    const updatedSections = currentResume.sections.map((sec) => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          title: title !== undefined ? title : sec.title,
          content: content !== undefined ? content : sec.content,
        };
      }
      return sec;
    });

    onUpdateResume({
      ...currentResume,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    const updatedSections = currentResume.sections.filter((s) => s.id !== sectionId);
    onUpdateResume({
      ...currentResume,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newSection: ResumeSection = {
      id: generateId(),
      type: newType,
      title: newTitle.trim(),
      content: newContent.trim(),
      order: currentResume.sections.length,
    };

    onUpdateResume({
      ...currentResume,
      sections: [...currentResume.sections, newSection],
      updatedAt: new Date().toISOString(),
    });

    setNewTitle('');
    setNewContent('');
    setShowAddSection(false);
  };

  const handleParseWithAI = () => {
    if (currentResume.rawText.trim()) {
      onSendMessage(`Parse my resume text:\n\n${currentResume.rawText}`);
    } else {
      onSendMessage('Parse my resume');
    }
    onClose();
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
          className="relative w-full max-w-xl bg-zinc-900 border-l border-zinc-800 shadow-2xl h-full flex flex-col z-10"
        >
          {/* Header */}
          <div className="h-14 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-100">Chat Resume</h2>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                {currentResume.sections.length} Sections
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Raw Text Card */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Raw Resume Text</span>
                {isEditingRaw ? (
                  <button
                    onClick={handleSaveRawText}
                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md transition-colors"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setRawTextValue(currentResume.rawText);
                      setIsEditingRaw(true);
                    }}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 px-2 py-1 rounded-md transition-colors"
                  >
                    <Edit2 className="w-3 h-3" /> Edit Text
                  </button>
                )}
              </div>

              {isEditingRaw ? (
                <textarea
                  value={rawTextValue}
                  onChange={(e) => setRawTextValue(e.target.value)}
                  rows={6}
                  placeholder="Paste your raw resume markdown or plain text here..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              ) : (
                <div className="text-xs text-zinc-400 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/50">
                  {currentResume.rawText || <span className="italic text-zinc-600">No raw resume text provided yet.</span>}
                </div>
              )}
            </div>

            {/* AI Action Bar */}
            <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5">
              <div className="text-xs">
                <p className="font-semibold text-emerald-400">Structured AI Parsing</p>
                <p className="text-[11px] text-zinc-400">Ask the AI agent to parse or update sections.</p>
              </div>
              <button
                onClick={handleParseWithAI}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Parse with AI
              </button>
            </div>

            {/* Structured Sections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Resume Sections
                </h3>
                <button
                  onClick={() => setShowAddSection(!showAddSection)}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  <Plus className="w-3 h-3" /> Add Section
                </button>
              </div>

              {showAddSection && (
                <form onSubmit={handleAddSectionSubmit} className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-zinc-500 mb-1">Type</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/60"
                      >
                        {['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'custom'].map((t) => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-[10px] text-zinc-500 mb-1">Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Work Experience"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Content</label>
                    <textarea
                      required
                      placeholder="Section content..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={3}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/60 resize-y"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSection(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1 rounded-md border border-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md hover:bg-emerald-500/20"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              {currentResume.sections.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/30">
                  <p className="text-xs text-zinc-500">No sections added yet.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Paste raw text above or ask the AI bot to extract sections!</p>
                </div>
              ) : (
                currentResume.sections.map((section) => (
                  <SectionItem
                    key={section.id}
                    section={section}
                    onUpdate={(sectionId, title, content) => handleUpdateSection(sectionId, title, content)}
                    onDelete={(sectionId) => handleDeleteSection(sectionId)}
                  />
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

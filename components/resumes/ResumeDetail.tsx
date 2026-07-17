'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Plus, Sparkles, FileText } from 'lucide-react';
import { Resume } from '@/lib/schemas';
import SectionItem from './SectionItem';

interface ResumeDetailProps {
  resume: Resume;
  onUpdateResume: (id: string, title?: string, rawText?: string) => void;
  onAddSection: (resumeId: string, type: string, title: string, content: string) => void;
  onUpdateSection: (resumeId: string, sectionId: string, title?: string, content?: string) => void;
  onDeleteSection: (resumeId: string, sectionId: string) => void;
  onParse: () => void;
  isParsing: boolean;
}

export default function ResumeDetail({
  resume,
  onUpdateResume,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onParse,
  isParsing,
}: ResumeDetailProps) {
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionType, setNewSectionType] = useState('custom');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionContent, setNewSectionContent] = useState('');

  const handleAddSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    onAddSection(resume.id, newSectionType, newSectionTitle.trim(), newSectionContent.trim());
    setNewSectionTitle('');
    setNewSectionContent('');
    setShowAddSection(false);
  };

  const isEmpty = resume.sections.length === 0;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-zinc-100">{resume.title}</h2>
          <span className="text-[10px] text-zinc-500">
            {resume.sections.length} section{resume.sections.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          Created {new Date(resume.createdAt).toLocaleDateString()} · Last updated {new Date(resume.updatedAt).toLocaleDateString()}
        </p>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl p-12 text-center bg-zinc-950/20">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-zinc-600 border border-zinc-800">
            <FileText className="w-5 h-5 text-zinc-500" />
          </div>
          <h4 className="text-zinc-300 font-semibold text-base">No sections parsed yet</h4>
          <p className="text-sm text-zinc-500 max-w-md mt-1 mb-5">
            Your resume text has been saved. Click below to have the AI analyze it and extract structured sections.
          </p>
          <button
            onClick={onParse}
            disabled={isParsing}
            className="flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-5 py-3 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className={`w-4 h-4 ${isParsing ? 'animate-spin' : ''}`} />
            {isParsing ? 'Parsing...' : 'Parse with AI'}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {resume.sections.map(section => (
                <SectionItem
                  key={section.id}
                  section={section}
                  onUpdate={(sectionId, title, content) => onUpdateSection(resume.id, sectionId, title, content)}
                  onDelete={(sectionId) => onDeleteSection(resume.id, sectionId)}
                />
              ))}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showAddSection && (
              <form onSubmit={handleAddSectionSubmit} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-zinc-500 mb-1">Type</label>
                    <select
                      value={newSectionType}
                      onChange={e => setNewSectionType(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/60"
                    >
                      {['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'custom'].map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-[2]">
                    <label className="block text-[10px] text-zinc-500 mb-1">Section Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Professional Experience"
                      value={newSectionTitle}
                      onChange={e => setNewSectionTitle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1">Content</label>
                  <textarea
                    required
                    placeholder="Section content..."
                    value={newSectionContent}
                    onChange={e => setNewSectionContent(e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 font-mono resize-y"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddSection(false)} className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all">Cancel</button>
                  <button type="submit" className="text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all">Add Section</button>
                </div>
              </form>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAddSection(!showAddSection)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-4 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Section
            </button>
            <button
              onClick={onParse}
              disabled={isParsing}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
              {isParsing ? 'Parsing...' : 'Re-parse with AI'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Edit3, Trash2, GripVertical } from 'lucide-react';
import { ResumeSection } from '@/lib/schemas';

const SECTION_COLORS: Record<string, string> = {
  summary: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  experience: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
  education: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  skills: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  projects: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  certifications: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  languages: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
};

interface SectionItemProps {
  section: ResumeSection;
  onUpdate: (id: string, title?: string, content?: string) => void;
  onDelete: (id: string) => void;
}

export default function SectionItem({ section, onUpdate, onDelete }: SectionItemProps) {
  const [editingField, setEditingField] = useState<'title' | 'content' | null>(null);
  const [editVal, setEditVal] = useState('');

  const startEdit = (field: 'title' | 'content') => {
    setEditingField(field);
    setEditVal(field === 'title' ? section.title : section.content);
  };

  const saveEdit = () => {
    if (!editingField) return;
    if (editingField === 'title' && editVal.trim()) {
      onUpdate(section.id, editVal.trim());
    } else if (editingField === 'content') {
      onUpdate(section.id, undefined, editVal);
    }
    setEditingField(null);
  };

  const colors = SECTION_COLORS[section.type] || 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden group"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/50">
        <GripVertical className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${colors}`}>
          {section.type}
        </span>

        {editingField === 'title' ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="text"
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={e => e.key === 'Enter' && saveEdit()}
              className="bg-zinc-950 border border-emerald-500/60 text-sm font-semibold text-zinc-100 rounded px-2 py-0.5 flex-1 min-w-0 focus:outline-none"
              autoFocus
            />
            <button onClick={saveEdit} className="text-[10px] bg-emerald-500 text-zinc-950 font-bold px-2 py-0.5 rounded hover:bg-emerald-400">Save</button>
          </div>
        ) : (
          <span
            onClick={() => startEdit('title')}
            className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 cursor-pointer flex items-center gap-1.5"
          >
            {section.title}
            <Edit3 className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
        )}

        <button
          onClick={() => onDelete(section.id)}
          className="ml-auto text-zinc-600 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 py-3">
        {editingField === 'content' ? (
          <div className="space-y-2">
            <textarea
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onBlur={saveEdit}
              className="bg-zinc-950 border border-emerald-500/60 text-sm text-zinc-300 rounded-lg px-3 py-2 w-full min-h-[120px] font-mono focus:outline-none resize-y"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingField(null)} className="text-[10px] text-zinc-400 hover:text-zinc-300 px-2 py-1 rounded">Cancel</button>
              <button onClick={saveEdit} className="text-[10px] bg-emerald-500 text-zinc-950 font-bold px-3 py-1 rounded hover:bg-emerald-400">Save</button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => startEdit('content')}
            className="text-sm text-zinc-400 whitespace-pre-wrap cursor-pointer group/content relative"
          >
            {section.content || <span className="italic text-zinc-600">Empty section content — click to edit</span>}
            <Edit3 className="w-3 h-3 text-zinc-600 absolute top-0 right-0 opacity-0 group-hover/content:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

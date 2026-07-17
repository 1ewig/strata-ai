'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { FolderPlus, Plus } from 'lucide-react';

interface TaskFormProps {
  onSubmit: (title: string, description?: string, steps?: string[]) => void;
  onCancel: () => void;
}

export default function TaskForm({ onSubmit, onCancel }: TaskFormProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStepsRaw, setNewStepsRaw] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const steps = newStepsRaw
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    onSubmit(newTitle.trim(), newDesc.trim() || undefined, steps.length > 0 ? steps : undefined);

    setNewTitle('');
    setNewDesc('');
    setNewStepsRaw('');
    onCancel();
  };

  return (
    <motion.form
      id="new-task-form"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      onSubmit={handleSubmit}
      className="overflow-hidden bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 shadow-inner"
    >
      <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
        <FolderPlus className="w-4 h-4" /> Create New Goal or Project
      </h4>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-zinc-400">Project / Goal Title *</label>
        <input
          id="input-task-title"
          type="text"
          required
          placeholder="e.g. Learn Portuguese, Fix Garden Shed"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-zinc-400">Description (Optional)</label>
        <input
          id="input-task-desc"
          type="text"
          placeholder="e.g. Practice daily to become conversational in 3 months"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-zinc-400">Initial Steps Breakdown (Optional, comma or newline separated)</label>
        <textarea
          id="input-task-steps"
          rows={2}
          placeholder="e.g. Buy beginners guidebook, Study verbs for 1hr, Listen to Portuguese podcast"
          value={newStepsRaw}
          onChange={(e) => setNewStepsRaw(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors font-sans resize-none"
        />
      </div>

      <button
        id="submit-new-task"
        type="submit"
        className="mt-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm py-2.5 px-4 rounded-lg transition-all shadow-[0_4px_15px_rgba(16,185,129,0.15)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.25)] focus:outline-none flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4 text-zinc-950" />
        Add Project
      </button>
    </motion.form>
  );
}

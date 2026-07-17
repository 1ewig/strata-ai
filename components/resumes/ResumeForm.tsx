'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Sparkles } from 'lucide-react';

interface ResumeFormProps {
  onSubmit: (title: string, rawText: string) => void;
  onCancel: () => void;
}

export default function ResumeForm({ onSubmit, onCancel }: ResumeFormProps) {
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rawText.trim()) return;
    onSubmit(title.trim(), rawText.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-emerald-400 mb-1">
          <FileText className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">New Resume</span>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Resume Title</label>
          <input
            type="text"
            required
            placeholder="e.g. John Doe — Software Engineer"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
            Paste your full resume text
            <span className="text-zinc-600 font-normal ml-1">— the AI will parse it into sections</span>
          </label>
          <textarea
            required
            placeholder={`John Doe\njohn.doe@email.com | (555) 123-4567\n\nSUMMARY\nExperienced software engineer with 5+ years...\n\nEXPERIENCE\nSenior Engineer, Tech Corp (2020-Present)\n- Led development of...`}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={12}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors font-mono resize-y"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-zinc-400 hover:text-zinc-300 px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-4 py-2 rounded-lg transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Parse with AI
          </button>
        </div>
      </form>
    </motion.div>
  );
}

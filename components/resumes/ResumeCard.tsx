'use client';

import { motion } from 'motion/react';
import { ChevronRight, FileText, Trash2 } from 'lucide-react';
import { Resume } from '@/lib/schemas';

interface ResumeCardProps {
  resume: Resume;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export default function ResumeCard({ resume, onClick, onDelete }: ResumeCardProps) {
  const sectionCount = resume.sections.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 p-5 rounded-2xl shadow-md transition-all duration-300 group cursor-pointer relative"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-grow">
          <h3 className="text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
            {resume.title}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Updated {new Date(resume.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800/40">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <FileText className="w-3.5 h-3.5 text-emerald-500" />
          <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''}</span>
          {resume.sections.length > 0 && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="truncate max-w-[200px]">
                {resume.sections.map(s => s.type).join(', ')}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(resume.id);
        }}
        className="absolute top-4 right-10 opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
        title="Delete resume"
      >
        <Trash2 className="w-4.5 h-4.5" />
      </button>
    </motion.div>
  );
}

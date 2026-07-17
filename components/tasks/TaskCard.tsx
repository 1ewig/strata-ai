'use client';

import { motion } from 'motion/react';
import { ChevronRight, Play, Trash2 } from 'lucide-react';
import { Task } from '@/lib/schemas';
import ProgressBar from '@/components/ui/ProgressBar';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({ task, onClick, onDelete }: TaskCardProps) {
  const completedCount = task.steps.filter(s => s.completed).length;
  const totalCount = task.steps.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
            {task.title}
          </h3>
          {task.description && (
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2 pr-6">
              {task.description}
            </p>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800/40">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Play className="w-3 h-3 text-emerald-500 fill-emerald-500/10" />
            <span>{completedCount} of {totalCount} breakdown steps complete</span>
          </span>
          <span className="font-bold text-emerald-400">{progressPercentage}%</span>
        </div>
        <ProgressBar value={progressPercentage} />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        className="absolute top-4 right-10 opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
        title="Delete project"
      >
        <Trash2 className="w-4.5 h-4.5" />
      </button>
    </motion.div>
  );
}

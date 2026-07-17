'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, Square, Edit3, Trash2 } from 'lucide-react';
import { TaskStep } from '@/lib/schemas';

interface StepItemProps {
  step: TaskStep;
  taskId: string;
  onUpdateStep: (taskId: string, stepId: string, title?: string, completed?: boolean) => void;
  onDeleteStep: (taskId: string, stepId: string) => void;
}

export default function StepItem({ step, taskId, onUpdateStep, onDeleteStep }: StepItemProps) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(step.title);

  const saveEdit = () => {
    if (editVal.trim()) {
      onUpdateStep(taskId, step.id, editVal.trim(), undefined);
    }
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors group ${
        step.completed
          ? 'bg-emerald-950/10 border-emerald-500/20 shadow-sm'
          : 'bg-zinc-950/80 border-zinc-850 hover:border-zinc-800'
      }`}
    >
      <button
        onClick={() => onUpdateStep(taskId, step.id, undefined, !step.completed)}
        className={`flex-shrink-0 focus:outline-none transition-colors ${
          step.completed ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-500'
        }`}
      >
        {step.completed ? (
          <CheckSquare className="w-5.5 h-5.5 fill-emerald-500/10" />
        ) : (
          <Square className="w-5.5 h-5.5" />
        )}
      </button>

      <div className="flex-grow min-w-0">
        {editing ? (
          <input
            type="text"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
            className="bg-zinc-950 border border-emerald-500/60 text-sm text-zinc-100 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-0"
            autoFocus
          />
        ) : (
          <p
            onClick={() => { setEditing(true); setEditVal(step.title); }}
            className={`text-sm break-words cursor-pointer hover:text-zinc-300 transition-colors flex items-center gap-1.5 ${
              step.completed ? 'text-zinc-500 line-through' : 'text-zinc-200 font-medium'
            }`}
            title="Click to rename step"
          >
            {step.title}
            <Edit3 className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </p>
        )}
      </div>

      <button
        onClick={() => onDeleteStep(taskId, step.id)}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-all"
        title="Delete step"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

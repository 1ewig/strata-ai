'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit3, BarChart2, Plus, Info } from 'lucide-react';
import { Task } from '@/lib/schemas';
import ProgressBar from '@/components/ui/ProgressBar';
import StepItem from './StepItem';

interface TaskDetailProps {
  task: Task;
  onUpdateTask: (id: string, title?: string, description?: string) => void;
  onAddStep: (taskId: string, title: string) => void;
  onUpdateStep: (taskId: string, stepId: string, title?: string, completed?: boolean) => void;
  onDeleteStep: (taskId: string, stepId: string) => void;
  onClose: () => void;
}

export default function TaskDetail({ task, onUpdateTask, onAddStep, onUpdateStep, onDeleteStep, onClose }: TaskDetailProps) {
  const [editingField, setEditingField] = useState<'title' | 'desc' | null>(null);
  const [editVal, setEditVal] = useState('');
  const [newStepInput, setNewStepInput] = useState('');

  const completedSteps = task.steps.filter(s => s.completed).length;
  const progressValue = task.steps.length > 0 ? Math.round((completedSteps / task.steps.length) * 100) : 0;

  const startEditingField = (field: 'title' | 'desc', currentVal: string) => {
    setEditingField(field);
    setEditVal(currentVal);
  };

  const saveEditedField = () => {
    if (!editingField) return;
    if (editingField === 'title' && editVal.trim()) {
      onUpdateTask(task.id, editVal.trim(), undefined);
    } else if (editingField === 'desc') {
      onUpdateTask(task.id, undefined, editVal.trim());
    }
    setEditingField(null);
  };

  const handleAddSingleStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepInput.trim()) return;
    onAddStep(task.id, newStepInput.trim());
    setNewStepInput('');
  };

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl relative"
    >
      <button
        onClick={() => {
          onClose();
          setEditingField(null);
        }}
        className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors focus:outline-none"
        title="Go back to project list"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="pr-10 mb-6">
        {editingField === 'title' ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={saveEditedField}
              onKeyDown={(e) => e.key === 'Enter' && saveEditedField()}
              className="bg-zinc-950 border border-emerald-500/60 text-xl font-bold text-zinc-100 rounded-lg px-3 py-1.5 w-full max-w-lg focus:outline-none focus:ring-0"
              autoFocus
            />
            <button onClick={saveEditedField} className="text-xs bg-emerald-500 text-zinc-950 font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-400">Save</button>
          </div>
        ) : (
          <h3
            onClick={() => startEditingField('title', task.title)}
            className="text-xl font-bold text-zinc-100 flex items-center gap-2 group cursor-pointer hover:text-zinc-300 transition-colors"
            title="Click to rename project"
          >
            {task.title}
            <Edit3 className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
        )}

        {editingField === 'desc' ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={saveEditedField}
              onKeyDown={(e) => e.key === 'Enter' && saveEditedField()}
              className="bg-zinc-950 border border-emerald-500/60 text-sm text-zinc-300 rounded-lg px-3 py-1.5 w-full max-w-lg focus:outline-none focus:ring-0"
              autoFocus
            />
            <button onClick={saveEditedField} className="text-xs bg-emerald-500 text-zinc-950 font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-400">Save</button>
          </div>
        ) : (
          <p
            onClick={() => startEditingField('desc', task.description || '')}
            className="text-sm text-zinc-400 mt-2 flex items-center gap-2 group cursor-pointer hover:text-zinc-300 transition-colors"
            title="Click to edit description"
          >
            {task.description || "Click to add a helpful description..."}
            <Edit3 className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        )}
      </div>

      <div className="mb-6 bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/80">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
          <span className="font-semibold flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5 text-emerald-400" /> Checklist Progress</span>
          <span>
            {completedSteps} of {task.steps.length} steps ({progressValue}%)
          </span>
        </div>
        <ProgressBar value={progressValue} animated size="md" />
      </div>

      <div className="space-y-2 mb-6">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Action Steps</h4>

        <AnimatePresence mode="popLayout">
          {task.steps.length > 0 ? (
            task.steps.map(step => (
              <StepItem
                key={step.id}
                step={step}
                taskId={task.id}
                onUpdateStep={onUpdateStep}
                onDeleteStep={onDeleteStep}
              />
            ))
          ) : (
            <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
              <Info className="w-4 h-4 mx-auto mb-2 text-zinc-600" />
              No steps defined. Add a step manually below or ask **TaskFlow** in the chat to break this project down!
            </div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleAddSingleStep} className="flex gap-2">
        <input
          id="input-single-step-title"
          type="text"
          required
          placeholder="e.g. Schedule first session"
          value={newStepInput}
          onChange={(e) => setNewStepInput(e.target.value)}
          className="flex-grow bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
        />
        <button
          id="submit-single-step"
          type="submit"
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs py-2 px-4 rounded-lg border border-zinc-700/50 transition-all focus:outline-none flex items-center gap-1 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" /> Add Step
        </button>
      </form>
    </motion.div>
  );
}

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, Plus, Trash2, Edit3, CheckCircle2, Circle, 
  ChevronRight, Calendar, Sparkles, FolderPlus, CheckSquare, 
  Square, X, Play, BarChart2, Info
} from 'lucide-react';
import { Task, TaskStep } from '@/lib/schemas';

interface TaskListProps {
  tasks: Task[];
  onAddTask: (title: string, description?: string, steps?: string[]) => void;
  onUpdateTask: (id: string, title?: string, description?: string) => void;
  onDeleteTask: (id: string) => void;
  onAddStep: (taskId: string, title: string) => void;
  onUpdateStep: (taskId: string, stepId: string, title?: string, completed?: boolean) => void;
  onDeleteStep: (taskId: string, stepId: string) => void;
}

export default function TaskList({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
}: TaskListProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStepsRaw, setNewStepsRaw] = useState('');
  const [newStepInput, setNewStepInput] = useState('');

  // Editing state for Task title/desc in detail view
  const [editingField, setEditingField] = useState<'title' | 'desc' | null>(null);
  const [editVal, setEditVal] = useState('');

  // Editing state for Step titles
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepVal, setEditStepVal] = useState('');

  // Find currently active task
  const activeTask = tasks.find(t => t.id === activeTaskId) || null;

  // Global Statistics
  const totalTasks = tasks.length;
  const totalSteps = tasks.reduce((sum, t) => sum + t.steps.length, 0);
  const completedSteps = tasks.reduce((sum, t) => sum + t.steps.filter(s => s.completed).length, 0);
  const totalProgressPercentage = totalSteps > 0 
    ? Math.round((completedSteps / totalSteps) * 100) 
    : 0;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Parse comma-separated or newline steps if any
    const steps = newStepsRaw
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    onAddTask(newTitle.trim(), newDesc.trim() || undefined, steps.length > 0 ? steps : undefined);

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    setNewStepsRaw('');
    setIsNewTaskOpen(false);
  };

  const handleAddSingleStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepInput.trim() || !activeTaskId) return;

    onAddStep(activeTaskId, newStepInput.trim());
    setNewStepInput('');
  };

  const startEditingField = (field: 'title' | 'desc', currentVal: string) => {
    setEditingField(field);
    setEditVal(currentVal);
  };

  const saveEditedField = () => {
    if (!activeTask || !editingField) return;
    
    if (editingField === 'title' && editVal.trim()) {
      onUpdateTask(activeTask.id, editVal.trim(), undefined);
    } else if (editingField === 'desc') {
      onUpdateTask(activeTask.id, undefined, editVal.trim());
    }
    setEditingField(null);
  };

  const startEditingStep = (stepId: string, currentVal: string) => {
    setEditingStepId(stepId);
    setEditStepVal(currentVal);
  };

  const saveEditedStep = (stepId: string) => {
    if (!activeTask || !editStepVal.trim()) return;
    onUpdateStep(activeTask.id, stepId, editStepVal.trim(), undefined);
    setEditingStepId(null);
  };

  return (
    <div id="task-list-container" className="flex flex-col gap-6">
      
      {/* Task Flow Header & Stats Card */}
      <div id="task-list-header" className="flex items-center justify-between">
        <div>
          <h2 id="task-list-title" className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <ClipboardList id="clipboard-header-icon" className="w-6 h-6 text-emerald-400" />
            Projects Checklist
          </h2>
          <p id="selected-date-subtitle" className="text-sm text-zinc-400 mt-1">Break down massive goals into actionable sub-tasks</p>
        </div>

        <button
          id="toggle-new-task-btn"
          onClick={() => setIsNewTaskOpen(!isNewTaskOpen)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all focus:outline-none ${
            isNewTaskOpen
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          {isNewTaskOpen ? 'Cancel' : 'New Project'}
          <Plus id="quick-add-plus-icon" className={`w-3.5 h-3.5 transition-transform duration-300 ${isNewTaskOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Progress Stats Banner */}
      <div
        id="global-progress-card"
        className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900 to-zinc-950/80 p-6 shadow-xl"
      >
        <div id="progress-glow" className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <h3 id="progress-card-title" className="text-lg font-medium text-zinc-200">Overall Goal Progress</h3>
            <div className="flex items-baseline gap-2">
              <span id="progress-percentage" className="text-4xl font-bold text-emerald-400 tracking-tight">{totalProgressPercentage}%</span>
              <span id="progress-fraction" className="text-sm text-zinc-400">({completedSteps} of {totalSteps} steps completed)</span>
            </div>
            <p id="progress-status-tip" className="text-xs text-zinc-400 max-w-sm">
              {totalProgressPercentage === 100 && totalTasks > 0
                ? "Perfect! All projects fully checked off. You're a productivity machine!"
                : totalProgressPercentage >= 50
                ? "Incredible progress! Keep ticking off milestones."
                : totalTasks > 0
                ? "Select a project to review, edit steps, or ask the AI Coach to suggest more steps."
                : "No projects added yet. Add a new project manually or ask TaskFlow in the chat!"}
            </p>
          </div>

          <div id="stats-breakdown" className="flex flex-row gap-6 text-center bg-zinc-950/60 py-3 px-6 rounded-xl border border-zinc-900">
            <div>
              <div className="text-base font-semibold text-zinc-100">{totalTasks}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">Projects</div>
            </div>
            <div className="border-l border-zinc-800 pl-6">
              <div className="text-base font-semibold text-emerald-400">{completedSteps}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">Done Steps</div>
            </div>
            <div className="border-l border-zinc-800 pl-6">
              <div className="text-base font-semibold text-zinc-400">{totalSteps - completedSteps}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">Todo Steps</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive New Project Form */}
      <AnimatePresence>
        {isNewTaskOpen && (
          <motion.form
            id="new-task-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleCreateTask}
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
        )}
      </AnimatePresence>

      {/* Main Splits: Active Detailed Task Panel OR Master Task Cards List */}
      <div id="master-split-container" className="relative min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTask ? (
            
            /* ========================================================
               TASK STEP-BY-STEP CHECKLIST DETAIL VIEW
               ======================================================== */
            <motion.div
              id="task-details-view"
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl relative"
            >
              {/* Return to list button */}
              <button
                id="close-details-btn"
                onClick={() => {
                  setActiveTaskId(null);
                  setEditingField(null);
                  setEditingStepId(null);
                }}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors focus:outline-none"
                title="Go back to project list"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Task Title & Description Header */}
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
                    onClick={() => startEditingField('title', activeTask.title)}
                    className="text-xl font-bold text-zinc-100 flex items-center gap-2 group cursor-pointer hover:text-zinc-300 transition-colors"
                    title="Click to rename project"
                  >
                    {activeTask.title}
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
                    onClick={() => startEditingField('desc', activeTask.description || '')}
                    className="text-sm text-zinc-400 mt-2 flex items-center gap-2 group cursor-pointer hover:text-zinc-300 transition-colors"
                    title="Click to edit description"
                  >
                    {activeTask.description || "Click to add a helpful description..."}
                    <Edit3 className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                )}
              </div>

              {/* Progress Tracker for this task */}
              <div className="mb-6 bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/80">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                  <span className="font-semibold flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5 text-emerald-400" /> Checklist Progress</span>
                  <span>
                    {activeTask.steps.filter(s => s.completed).length} of {activeTask.steps.length} steps (
                    {activeTask.steps.length > 0 
                      ? Math.round((activeTask.steps.filter(s => s.completed).length / activeTask.steps.length) * 100) 
                      : 0}% )
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <motion.div 
                    className="bg-emerald-500 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${activeTask.steps.length > 0 
                        ? (activeTask.steps.filter(s => s.completed).length / activeTask.steps.length) * 100 
                        : 0}%` 
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Steps Checklist */}
              <div className="space-y-2 mb-6">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Action Steps</h4>
                
                <AnimatePresence mode="popLayout">
                  {activeTask.steps.length > 0 ? (
                    activeTask.steps.map(step => (
                      <motion.div
                        id={`step-card-${step.id}`}
                        key={step.id}
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
                        {/* Done Toggle Box */}
                        <button
                          id={`step-check-${step.id}`}
                          onClick={() => onUpdateStep(activeTask.id, step.id, undefined, !step.completed)}
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

                        {/* Step Title Input or Label */}
                        <div className="flex-grow min-w-0">
                          {editingStepId === step.id ? (
                            <input
                              type="text"
                              value={editStepVal}
                              onChange={(e) => setEditStepVal(e.target.value)}
                              onBlur={() => saveEditedStep(step.id)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditedStep(step.id)}
                              className="bg-zinc-950 border border-emerald-500/60 text-sm text-zinc-100 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-0"
                              autoFocus
                            />
                          ) : (
                            <p
                              onClick={() => startEditingStep(step.id, step.title)}
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

                        {/* Step Delete Button */}
                        <button
                          id={`step-delete-${step.id}`}
                          onClick={() => onDeleteStep(activeTask.id, step.id)}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-all"
                          title="Delete step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                      <Info className="w-4 h-4 mx-auto mb-2 text-zinc-600" />
                      No steps defined. Add a step manually below or ask **TaskFlow** in the chat to break this project down!
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Add Single Step Form */}
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
          ) : (
            
            /* ========================================================
               MASTER TASKS LIST HOMEPAGE
               ======================================================== */
            <motion.div
              id="tasks-home-view"
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Your Active Goals</h4>
              
              <AnimatePresence mode="popLayout">
                {tasks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {tasks.map(task => {
                      const completedCount = task.steps.filter(s => s.completed).length;
                      const totalCount = task.steps.length;
                      const progressPercentage = totalCount > 0 
                        ? Math.round((completedCount / totalCount) * 100) 
                        : 0;

                      return (
                        <motion.div
                          id={`task-card-${task.id}`}
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          whileHover={{ y: -2 }}
                          className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 p-5 rounded-2xl shadow-md transition-all duration-300 group cursor-pointer relative"
                          onClick={() => setActiveTaskId(task.id)}
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

                            {/* Chevron Entry Arrow */}
                            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </div>

                          {/* Steps and Progress bar indicators */}
                          <div className="mt-4 pt-4 border-t border-zinc-800/40">
                            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                              <span className="flex items-center gap-1.5">
                                <Play className="w-3 h-3 text-emerald-500 fill-emerald-500/10" /> 
                                <span>{completedCount} of {totalCount} breakdown steps complete</span>
                              </span>
                              <span className="font-bold text-emerald-400">{progressPercentage}%</span>
                            </div>
                            <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Quick Absolute Delete Button on hover */}
                          <button
                            id={`task-delete-btn-${task.id}`}
                            onClick={(e) => {
                              e.stopPropagation(); // Avoid triggering open card onClick
                              onDeleteTask(task.id);
                            }}
                            className="absolute top-4 right-10 opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
                            title="Delete project"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl p-12 text-center bg-zinc-950/20">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-zinc-600 border border-zinc-800">
                      <ClipboardList className="w-5 h-5 text-zinc-500" />
                    </div>
                    <h4 className="text-zinc-300 font-semibold text-base">No projects listed</h4>
                    <p className="text-sm text-zinc-500 max-w-sm mt-1 mb-5">
                      Your master tasklist is empty! Add a new goal manually or ask **TaskFlow AI** to break down a big idea for you.
                    </p>
                    <button
                      onClick={() => setIsNewTaskOpen(true)}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all focus:outline-none"
                    >
                      Quick Create Project
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

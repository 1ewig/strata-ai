'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ClipboardList, Plus, BarChart2, FolderPlus, Info } from 'lucide-react';
import { Task } from '@/lib/schemas';
import ProgressBar from '@/components/ui/ProgressBar';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm from '@/components/tasks/TaskForm';

interface TaskListProps {
  tasks: Task[];
  onAddTask: (title: string, description?: string, steps?: string[]) => void;
  onDeleteTask: (id: string) => void;
}

export default function TaskList({ tasks, onAddTask, onDeleteTask }: TaskListProps) {
  const router = useRouter();
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const totalTasks = tasks.length;
  const totalSteps = tasks.reduce((sum, t) => sum + t.steps.length, 0);
  const completedSteps = tasks.reduce((sum, t) => sum + t.steps.filter(s => s.completed).length, 0);
  const totalProgressPercentage = totalSteps > 0
    ? Math.round((completedSteps / totalSteps) * 100)
    : 0;

  return (
    <div id="task-list-container" className="flex flex-col gap-6">

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

      <AnimatePresence>
        {isNewTaskOpen && (
          <TaskForm
            onSubmit={(title, description, steps) => {
              onAddTask(title, description, steps);
              setIsNewTaskOpen(false);
            }}
            onCancel={() => setIsNewTaskOpen(false)}
          />
        )}
      </AnimatePresence>

      <div id="master-split-container" className="relative min-h-[300px]">
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Your Active Goals</h4>

          <AnimatePresence mode="popLayout">
            {tasks.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => router.push('/tasks/' + task.slug)}
                    onDelete={onDeleteTask}
                  />
                ))}
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
        </div>
      </div>

    </div>
  );
}

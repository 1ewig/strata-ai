'use client';

import React from 'react';
import Link from 'next/link';
import { BrainCircuit, MessageSquare, ListTodo } from 'lucide-react';
import { useTasks } from '@/contexts/TaskContext';
import StatsHeader from '@/components/ui/StatsHeader';
import TaskList from '@/components/TaskList';

export default function TasksPage() {
  const {
    tasks,
    handleAddTask,
    handleDeleteTask,
    activeTasksCount,
    totalStepsCount,
    completedStepsCount,
  } = useTasks();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">

      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <BrainCircuit className="w-5.5 h-5.5 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-1.5">
                TaskFlow
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">PLANNER</span>
              </h1>
              <p className="text-[10px] text-zinc-400">AI Task Breakdown & Project Organizer</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <StatsHeader
              activeTasksCount={activeTasksCount}
              completedStepsCount={completedStepsCount}
              totalStepsCount={totalStepsCount}
            />
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </Link>
          </div>

        </div>
      </header>

      <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col justify-stretch">
        <TaskList
          tasks={tasks}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
        />
      </div>

      <footer className="border-t border-zinc-900 py-4 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-zinc-600">
            TaskFlow © 2026 • Visualizing massive ambitions as simple sequential steps.
          </p>
        </div>
      </footer>

    </main>
  );
}

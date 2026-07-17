'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BrainCircuit, ListTodo, Sparkles, MessageSquare } from 'lucide-react';
import { useTasks } from '@/contexts/TaskContext';
import { useIsMobile } from '@/hooks/use-mobile';
import StatsHeader from '@/components/ui/StatsHeader';
import TaskList from '@/components/TaskList';
import ChatPanel from '@/components/ChatPanel';

export default function TasksPage() {
  const {
    tasks,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    handleAddStep,
    handleUpdateStep,
    handleDeleteStep,
    handleAgentUpdateTasks,
    activeTasksCount,
    totalStepsCount,
    completedStepsCount,
  } = useTasks();

  const isMobile = useIsMobile();
  const [activeMobileTab, setActiveMobileTab] = useState<'checklist' | 'assistant'>('checklist');

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

        {isMobile && (
        <div className="flex bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl mb-5 w-full gap-1">
          <button
            onClick={() => setActiveMobileTab('checklist')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all focus:outline-none ${
              activeMobileTab === 'checklist'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <ListTodo className="w-4 h-4 text-emerald-400" />
            Checklist Planner
          </button>

          <button
            onClick={() => setActiveMobileTab('assistant')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all focus:outline-none ${
              activeMobileTab === 'assistant'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            AI Breakdown Coach
          </button>
        </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full flex-grow">

          <div
            className={`md:col-span-7 space-y-6 ${!isMobile || activeMobileTab === 'checklist' ? 'block' : 'hidden'}`}
          >
            <TaskList
              tasks={tasks}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAddStep={handleAddStep}
              onUpdateStep={handleUpdateStep}
              onDeleteStep={handleDeleteStep}
            />
          </div>

          <div
            className={`md:col-span-5 h-full ${!isMobile || activeMobileTab === 'assistant' ? 'block' : 'hidden'}`}
          >
            <ChatPanel
              tasks={tasks}
              onAgentUpdateTasks={handleAgentUpdateTasks}
            />
          </div>

        </div>

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

'use client';

import React from 'react';
import Link from 'next/link';
import { BrainCircuit, ListTodo } from 'lucide-react';
import { useTasks } from '@/contexts/TaskContext';
import ChatPanel from '@/components/ChatPanel';

export default function Home() {
  const { tasks, handleAgentUpdateTasks } = useTasks();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">

      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <BrainCircuit className="w-5 h-5 text-zinc-950" />
            </div>
            <h1 className="text-base font-bold tracking-tight text-zinc-100">TaskFlow</h1>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">PLAYGROUND</span>
          </div>
          <Link
            href="/tasks"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all"
          >
            <ListTodo className="w-3.5 h-3.5" />
            Tasks & Steps
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl h-[calc(100vh-8rem)]">
          <ChatPanel tasks={tasks} onAgentUpdateTasks={handleAgentUpdateTasks} />
        </div>
      </div>

    </main>
  );
}

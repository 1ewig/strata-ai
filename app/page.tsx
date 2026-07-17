'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ClipboardList, ListTodo, BrainCircuit, Activity, Award } from 'lucide-react';
import { Task, TaskStep } from '@/lib/schemas';
import { getStoredTasks, saveTasks } from '@/lib/tasks';
import TaskList from '@/components/TaskList';
import ChatPanel from '@/components/ChatPanel';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeMobileTab, setActiveMobileTab] = useState<'checklist' | 'assistant'>('checklist');

  // Load tasks on mount
  useEffect(() => {
    const loadedTasks = getStoredTasks();
    setTimeout(() => {
      setTasks(loadedTasks);
    }, 0);
  }, []);

  // Sync state changes back to localStorage
  const handleSaveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  // 1. Add Task manual / AI callback
  const handleAddTask = (title: string, description?: string, steps?: string[]) => {
    const stepItems: TaskStep[] = (steps || []).map(stepTitle => ({
      id: crypto.randomUUID(),
      title: stepTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    }));

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description,
      steps: stepItems,
      createdAt: new Date().toISOString(),
    };

    const updated = [...tasks, newTask];
    handleSaveTasks(updated);
  };

  // 2. Update Task Details
  const handleUpdateTask = (id: string, title?: string, description?: string) => {
    const updated = tasks.map(task => {
      if (task.id === id) {
        return {
          ...task,
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
        };
      }
      return task;
    });
    handleSaveTasks(updated);
  };

  // 3. Delete Task
  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(task => task.id !== id);
    handleSaveTasks(updated);
  };

  // 4. Add Step to a Task
  const handleAddStep = (taskId: string, title: string) => {
    const updated = tasks.map(task => {
      if (task.id === taskId) {
        const newStep: TaskStep = {
          id: crypto.randomUUID(),
          title: title.trim(),
          completed: false,
          createdAt: new Date().toISOString(),
        };
        return {
          ...task,
          steps: [...task.steps, newStep],
        };
      }
      return task;
    });
    handleSaveTasks(updated);
  };

  // 5. Update Step checkbox / title
  const handleUpdateStep = (taskId: string, stepId: string, title?: string, completed?: boolean) => {
    const updated = tasks.map(task => {
      if (task.id === taskId) {
        const stepsCopy = task.steps.map(step => {
          if (step.id === stepId) {
            return {
              ...step,
              ...(title !== undefined && { title }),
              ...(completed !== undefined && { completed }),
            };
          }
          return step;
        });
        return {
          ...task,
          steps: stepsCopy,
        };
      }
      return task;
    });
    handleSaveTasks(updated);
  };

  // 6. Delete Step from Task
  const handleDeleteStep = (taskId: string, stepId: string) => {
    const updated = tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          steps: task.steps.filter(step => step.id !== stepId),
        };
      }
      return task;
    });
    handleSaveTasks(updated);
  };

  // 7. Update Tasks fully from AI Agent tool executions
  const handleAgentUpdateTasks = (newTasks: Task[]) => {
    handleSaveTasks(newTasks);
  };

  // Calculations for general workspace stats dashboard
  const activeTasksCount = tasks.length;
  const totalStepsCount = tasks.reduce((acc, t) => acc + t.steps.length, 0);
  const completedStepsCount = tasks.reduce((acc, t) => acc + t.steps.filter(s => s.completed).length, 0);

  return (
    <main id="app-workspace-root" className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* Top Header Panel */}
      <header id="main-app-header" className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Branding */}
          <div id="header-logo-group" className="flex items-center gap-3">
            <div id="logo-icon-container" className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <BrainCircuit id="header-brain-logo" className="w-5.5 h-5.5 text-zinc-950" />
            </div>
            <div>
              <h1 id="app-branded-title" className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-1.5">
                TaskFlow
                <span id="app-beta-badge" className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">PLANNER</span>
              </h1>
              <p id="app-branded-tagline" className="text-[10px] text-zinc-400">AI Task Breakdown & Project Organizer</p>
            </div>
          </div>

          {/* Quick summary statistics */}
          <div id="header-stats-panel" className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Activity id="header-activity-icon" className="w-4 h-4 text-emerald-500" />
              <span>Active Goals: <strong id="header-stats-active" className="text-zinc-200">{activeTasksCount}</strong></span>
            </div>
            <div className="flex items-center gap-2 border-l border-zinc-900 pl-6">
              <Award id="header-award-icon" className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Steps Complete: <strong id="header-stats-done" className="text-zinc-200">{completedStepsCount}/{totalStepsCount}</strong></span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Workspace Layout Grid */}
      <div id="workspace-layout" className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col justify-stretch">
        
        {/* Mobile Tab Switcher Buttons */}
        <div id="mobile-layout-tabs" className="md:hidden flex bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl mb-5 w-full gap-1">
          <button
            id="mobile-tab-checklist"
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
            id="mobile-tab-assistant"
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

        {/* Master Split Grid */}
        <div id="split-grid-wrapper" className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start h-full flex-grow">
          
          {/* LEFT: Project check-off list and detailed view panels */}
          <div
            id="checklist-column-wrapper"
            className={`md:col-span-7 space-y-6 ${activeMobileTab === 'checklist' ? 'block' : 'hidden md:block'}`}
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

          {/* RIGHT: AI assistant chat coach panel */}
          <div
            id="assistant-column-wrapper"
            className={`md:col-span-5 h-full ${activeMobileTab === 'assistant' ? 'block' : 'hidden md:block'}`}
          >
            <ChatPanel
              tasks={tasks}
              onAgentUpdateTasks={handleAgentUpdateTasks}
            />
          </div>

        </div>

      </div>

      {/* Credit Footer */}
      <footer id="app-footer" className="border-t border-zinc-900 py-4 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p id="footer-credit-text" className="text-xs text-zinc-600">
            TaskFlow © 2026 • Visualizing massive ambitions as simple sequential steps.
          </p>
        </div>
      </footer>

    </main>
  );
}

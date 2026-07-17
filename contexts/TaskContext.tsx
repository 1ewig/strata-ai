'use client';

import React, { createContext, useContext } from 'react';
import { Task } from '@/lib/schemas';
import { useTaskCrud } from '@/hooks/useTaskCrud';

interface TaskContextType {
  tasks: Task[];
  handleAddTask: (title: string, description?: string, steps?: string[]) => void;
  handleUpdateTask: (id: string, title?: string, description?: string) => void;
  handleDeleteTask: (id: string) => void;
  handleAddStep: (taskId: string, title: string) => void;
  handleUpdateStep: (taskId: string, stepId: string, title?: string, completed?: boolean) => void;
  handleDeleteStep: (taskId: string, stepId: string) => void;
  handleAgentUpdateTasks: (newTasks: Task[]) => void;
  activeTasksCount: number;
  totalStepsCount: number;
  completedStepsCount: number;
}

const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const ctx = useTaskCrud();
  return <TaskContext.Provider value={ctx}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within TaskProvider');
  return context;
}

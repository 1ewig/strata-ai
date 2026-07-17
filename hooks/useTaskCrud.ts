'use client';

import { useState, useEffect } from "react";
import { Task, TaskStep } from "@/lib/schemas";
import { getStoredTasks, saveTasks } from "@/lib/data/storage";
import { generateId } from "@/lib/id";

export function useTaskCrud() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadedTasks = getStoredTasks();
    setTimeout(() => {
      setTasks(loadedTasks);
    }, 0);
  }, []);

  const handleSaveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const handleAddTask = (title: string, description?: string, steps?: string[]) => {
    const stepItems: TaskStep[] = (steps || []).map(stepTitle => ({
      id: generateId(),
      title: stepTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    }));

    const newTask: Task = {
      id: generateId(),
      title: title.trim(),
      description,
      steps: stepItems,
      createdAt: new Date().toISOString(),
    };

    const updated = [...tasks, newTask];
    handleSaveTasks(updated);
  };

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

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(task => task.id !== id);
    handleSaveTasks(updated);
  };

  const handleAddStep = (taskId: string, title: string) => {
    const updated = tasks.map(task => {
      if (task.id === taskId) {
        const newStep: TaskStep = {
          id: generateId(),
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

  const handleAgentUpdateTasks = (newTasks: Task[]) => {
    handleSaveTasks(newTasks);
  };

  const activeTasksCount = tasks.length;
  const totalStepsCount = tasks.reduce((acc, t) => acc + t.steps.length, 0);
  const completedStepsCount = tasks.reduce((acc, t) => acc + t.steps.filter(s => s.completed).length, 0);

  return {
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
  };
}

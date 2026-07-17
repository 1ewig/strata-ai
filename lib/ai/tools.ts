import { Type, FunctionDeclaration } from "@google/genai";
import { Task, TaskStep } from "../schemas";
import { generateId } from "../id";

export const addTaskTool: FunctionDeclaration = {
  name: "addTask",
  description: "Create/Add a new high-level task. You can optionally pass an array of step titles to pre-populate its breakdown.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "The high-level goal or task title (e.g., 'Learn Portuguese', 'Plan summer trip')."
      },
      description: {
        type: Type.STRING,
        description: "A short context or description of the task (optional)."
      },
      steps: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        },
        description: "An array of detailed action items/steps that break down this task (optional, highly recommended for instant planning)."
      }
    },
    required: ["title"]
  }
};

export const addStepTool: FunctionDeclaration = {
  name: "addStep",
  description: "Add a new breakdown step to an existing task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: {
        type: Type.STRING,
        description: "The UUID of the parent task."
      },
      title: {
        type: Type.STRING,
        description: "The action-oriented title of the step (e.g., 'Draft introductory paragraph')."
      }
    },
    required: ["taskId", "title"]
  }
};

export const updateTaskTool: FunctionDeclaration = {
  name: "updateTask",
  description: "Update the core details (title or description) of an existing task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: "The UUID of the task to update."
      },
      title: {
        type: Type.STRING,
        description: "The new title of the task (optional)."
      },
      description: {
        type: Type.STRING,
        description: "The new description of the task (optional)."
      }
    },
    required: ["id"]
  }
};

export const updateStepTool: FunctionDeclaration = {
  name: "updateStep",
  description: "Update a step's details, such as changing its title or toggling its completion (completed true/false).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: {
        type: Type.STRING,
        description: "The UUID of the parent task containing the step."
      },
      stepId: {
        type: Type.STRING,
        description: "The UUID of the step to update."
      },
      title: {
        type: Type.STRING,
        description: "The new title of the step (optional)."
      },
      completed: {
        type: Type.BOOLEAN,
        description: "Set to true to mark step complete, or false to mark incomplete (optional)."
      }
    },
    required: ["taskId", "stepId"]
  }
};

export const deleteTaskTool: FunctionDeclaration = {
  name: "deleteTask",
  description: "Delete an entire task and all of its associated steps.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: "The UUID of the task to delete."
      }
    },
    required: ["id"]
  }
};

export const deleteStepTool: FunctionDeclaration = {
  name: "deleteStep",
  description: "Delete a specific step from a task's breakdown.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: {
        type: Type.STRING,
        description: "The UUID of the parent task."
      },
      stepId: {
        type: Type.STRING,
        description: "The UUID of the step to delete."
      }
    },
    required: ["taskId", "stepId"]
  }
};

export const listTasksTool: FunctionDeclaration = {
  name: "listTasks",
  description: "Retrieve the list of all current tasks and their step breakdowns.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

export const ALL_TOOLS = [
  addTaskTool,
  addStepTool,
  updateTaskTool,
  updateStepTool,
  deleteTaskTool,
  deleteStepTool,
  listTasksTool
];

export function executeTool(
  name: string,
  args: any,
  tasks: Task[]
): { result: any; updatedTasks: Task[]; updated: boolean } {
  let updated = false;
  let updatedTasks = [...tasks];
  let result: any = null;

  switch (name) {
    case "addTask": {
      const stepTitles: string[] = args.steps || [];
      const newSteps: TaskStep[] = stepTitles.map(title => ({
        id: generateId(),
        title: title.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      }));

      const newTask: Task = {
        id: generateId(),
        title: args.title || "Untitled Task",
        description: args.description || "",
        steps: newSteps,
        createdAt: new Date().toISOString()
      };

      updatedTasks.push(newTask);
      result = {
        status: "success",
        message: `Created task "${newTask.title}" with ${newSteps.length} steps.`,
        task: newTask
      };
      updated = true;
      break;
    }

    case "addStep": {
      const taskIndex = updatedTasks.findIndex(t => t.id === args.taskId);
      if (taskIndex !== -1) {
        const task = updatedTasks[taskIndex];
        const newStep: TaskStep = {
          id: generateId(),
          title: args.title || "Untitled Step",
          completed: false,
          createdAt: new Date().toISOString()
        };

        updatedTasks[taskIndex] = {
          ...task,
          steps: [...task.steps, newStep]
        };

        result = {
          status: "success",
          message: `Added step "${newStep.title}" to task "${task.title}".`,
          step: newStep
        };
        updated = true;
      } else {
        result = { status: "error", message: `Task with ID ${args.taskId} not found.` };
      }
      break;
    }

    case "updateTask": {
      const taskIndex = updatedTasks.findIndex(t => t.id === args.id);
      if (taskIndex !== -1) {
        const original = updatedTasks[taskIndex];
        const updatedTask = {
          ...original,
          ...(args.title !== undefined && { title: args.title }),
          ...(args.description !== undefined && { description: args.description }),
        };
        updatedTasks[taskIndex] = updatedTask;
        result = {
          status: "success",
          message: `Updated task "${updatedTask.title}" details.`,
          task: updatedTask
        };
        updated = true;
      } else {
        result = { status: "error", message: `Task with ID ${args.id} not found.` };
      }
      break;
    }

    case "updateStep": {
      const taskIndex = updatedTasks.findIndex(t => t.id === args.taskId);
      if (taskIndex !== -1) {
        const task = updatedTasks[taskIndex];
        const stepIndex = task.steps.findIndex(s => s.id === args.stepId);

        if (stepIndex !== -1) {
          const originalStep = task.steps[stepIndex];
          const updatedStep = {
            ...originalStep,
            ...(args.title !== undefined && { title: args.title }),
            ...(args.completed !== undefined && { completed: args.completed }),
          };

          const stepsCopy = [...task.steps];
          stepsCopy[stepIndex] = updatedStep;

          updatedTasks[taskIndex] = {
            ...task,
            steps: stepsCopy
          };

          result = {
            status: "success",
            message: `Updated step "${updatedStep.title}" in task "${task.title}".`,
            step: updatedStep
          };
          updated = true;
        } else {
          result = { status: "error", message: `Step with ID ${args.stepId} not found in task "${task.title}".` };
        }
      } else {
        result = { status: "error", message: `Task with ID ${args.taskId} not found.` };
      }
      break;
    }

    case "deleteTask": {
      const taskIndex = updatedTasks.findIndex(t => t.id === args.id);
      if (taskIndex !== -1) {
        const deleted = updatedTasks[taskIndex];
        updatedTasks = updatedTasks.filter(t => t.id !== args.id);
        result = { status: "success", message: `Deleted task "${deleted.title}" and all its steps.` };
        updated = true;
      } else {
        result = { status: "error", message: `Task with ID ${args.id} not found.` };
      }
      break;
    }

    case "deleteStep": {
      const taskIndex = updatedTasks.findIndex(t => t.id === args.taskId);
      if (taskIndex !== -1) {
        const task = updatedTasks[taskIndex];
        const stepIndex = task.steps.findIndex(s => s.id === args.stepId);

        if (stepIndex !== -1) {
          const deletedStep = task.steps[stepIndex];
          const filteredSteps = task.steps.filter(s => s.id !== args.stepId);

          updatedTasks[taskIndex] = {
            ...task,
            steps: filteredSteps
          };

          result = { status: "success", message: `Deleted step "${deletedStep.title}" from task "${task.title}".` };
          updated = true;
        } else {
          result = { status: "error", message: `Step with ID ${args.stepId} not found in task "${task.title}".` };
        }
      } else {
        result = { status: "error", message: `Task with ID ${args.taskId} not found.` };
      }
      break;
    }

    case "listTasks": {
      result = { status: "success", tasks: updatedTasks };
      break;
    }

    default:
      result = { status: "error", message: `Unknown tool execution: ${name}` };
  }

  return { result, updatedTasks, updated };
}

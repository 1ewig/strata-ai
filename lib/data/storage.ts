import { Task } from "../schemas";
import { generateId } from "../id";

export const SAMPLE_TASKS: Omit<Task, 'id' | 'createdAt'>[] = [
  {
    title: "Build a Modern Website",
    description: "Create a fully responsive Next.js portfolio website with Tailwind CSS.",
    steps: [
      {
        id: "10000000-0000-0000-0000-000000000001",
        title: "Initialize Next.js project and configure Tailwind v4",
        completed: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "10000000-0000-0000-0000-000000000002",
        title: "Design the home page with a striking hero section",
        completed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "10000000-0000-0000-0000-000000000003",
        title: "Implement dark/light theme options using CSS variables",
        completed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "10000000-0000-0000-0000-000000000004",
        title: "Deploy the application to Cloud Run or Vercel",
        completed: false,
        createdAt: new Date().toISOString(),
      }
    ]
  },
  {
    title: "Launch a Podcast",
    description: "Plan, record, and distribute the first episode of a tech talk podcast.",
    steps: [
      {
        id: "10000000-0000-0000-0000-000000000005",
        title: "Define the niche and pick a catchy brand name",
        completed: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "10000000-0000-0000-0000-000000000006",
        title: "Purchase an external USB condenser microphone",
        completed: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "10000000-0000-0000-0000-000000000007",
        title: "Outline the script and guest questions for Episode 1",
        completed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "10000000-0000-0000-0000-000000000008",
        title: "Record, edit in Audacity, and publish to Spotify",
        completed: false,
        createdAt: new Date().toISOString(),
      }
    ]
  }
];

export function getStoredTasks(): Task[] {
  if (typeof window === "undefined") return [];

  const key = "taskflow_tasks";
  const stored = localStorage.getItem(key);

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing tasks", e);
    }
  }

  const defaultTasks: Task[] = SAMPLE_TASKS.map((sample, index) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - (SAMPLE_TASKS.length - index) * 15);
    return {
      ...sample,
      id: generateId(),
      createdAt: d.toISOString(),
      steps: sample.steps.map(step => ({
        ...step,
        id: generateId(),
        createdAt: d.toISOString(),
      }))
    };
  });

  localStorage.setItem(key, JSON.stringify(defaultTasks));
  return defaultTasks;
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  const key = "taskflow_tasks";
  localStorage.setItem(key, JSON.stringify(tasks));
}

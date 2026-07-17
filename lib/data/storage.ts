import { Task } from "../schemas";
import { generateId } from "../id";
import { toSlug } from "../slug";

export const SAMPLE_TASKS: Omit<Task, 'id' | 'slug' | 'createdAt'>[] = [
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
      const parsed = JSON.parse(stored) as any[];
      if (parsed.some(t => !t.slug)) {
        const migrated = parsed.map(t => ({
          ...t,
          slug: t.slug || `${toSlug(t.title)}-${t.id.slice(0, 6)}`,
        }));
        localStorage.setItem(key, JSON.stringify(migrated));
        return migrated as Task[];
      }
      return parsed as Task[];
    } catch (e) {
      console.error("Error parsing tasks", e);
    }
  }

  const defaultTasks: Task[] = SAMPLE_TASKS.map((sample, index) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - (SAMPLE_TASKS.length - index) * 15);
    const slug = toSlug(sample.title);
    return {
      ...sample,
      slug: slug + (index > 0 ? `-${index}` : ''),
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

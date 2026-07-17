import { Resume } from "../schemas";
import { toSlug } from "../slug";

const STORAGE_KEY = "resumeflow_resumes";

export function getStoredResumes(): Resume[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as any[];
      if (parsed.some(r => !r.slug)) {
        const migrated = parsed.map(r => ({
          ...r,
          slug: r.slug || `${toSlug(r.title)}-${r.id.slice(0, 6)}`,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated as Resume[];
      }
      return parsed as Resume[];
    } catch (e) {
      console.error("Error parsing resumes", e);
    }
  }

  return [];
}

export function saveResumes(resumes: Resume[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
}

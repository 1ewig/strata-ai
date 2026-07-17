import { Task } from './schemas';

export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'untitled';
}

export function generateUniqueSlug(title: string, existingTasks: Task[]): string {
  const baseSlug = toSlug(title);
  let slug = baseSlug;
  let counter = 1;
  while (existingTasks.some(t => t.slug === slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

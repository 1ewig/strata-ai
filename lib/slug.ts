import { Resume } from './schemas';

export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'untitled';
}

export function generateUniqueSlug(title: string, existingResumes: Resume[]): string {
  const baseSlug = toSlug(title);
  let slug = baseSlug;
  let counter = 1;
  while (existingResumes.some(r => r.slug === slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

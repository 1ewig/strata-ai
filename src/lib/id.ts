/**
 * Generates a unique identifier.
 * @returns A UUID, or a timestamp/random fallback when the environment lacks `crypto.randomUUID`.
 */
export function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for environments without a secure random UUID implementation
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

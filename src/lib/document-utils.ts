import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_DATA_URL_CHARS,
  MAX_DOCUMENT_INPUT_BYTES,
  MAX_DOCUMENT_TEXT_CHARS,
} from '@/lib/limits';

/** A processed, wire-ready document attachment. */
export interface ProcessedDocument {
  /** Base64 data URL ready for a `file` UI part. */
  dataUrl: string;
  /** IANA media type of the encoded document. */
  mediaType: string;
  /** Original filename for labeling, tool inspection, and icons. */
  filename: string;
  /** Original byte size. */
  size: number;
  /** Extracted or parsed text content for text-based formats. */
  textContent?: string;
  /** Whether the text content was truncated to fit the token budget. */
  isTruncated?: boolean;
}

/** Result of a synchronous attachment validation, null when accepted. */
export type DocumentValidationError = string | null;

/**
 * Checks whether a filename ends with an accepted document extension.
 * @param filename - The filename to inspect.
 * @returns True when the extension is allowed.
 */
export function hasAllowedDocumentExtension(filename: string): boolean {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Checks whether a media type is on the document whitelist.
 * @param mediaType - The IANA media type to check.
 * @returns True when the media type is acceptable.
 */
export function isAllowedDocumentMime(mediaType: string): boolean {
  if (!mediaType) return false;
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(mediaType);
}

/**
 * Resolves a normalized MIME type from a file's type and name.
 * @param file - The file object with type and name.
 * @returns The best matching media type string.
 */
export function resolveDocumentMediaType(file: { name: string; type?: string }): string {
  if (file.type && isAllowedDocumentMime(file.type)) {
    return file.type;
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.tsv')) return 'text/tab-separated-values';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text/markdown';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.css')) return 'text/css';
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'text/javascript';
  if (lower.endsWith('.py')) return 'text/x-python';
  if (lower.endsWith('.sql')) return 'application/sql';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'text/yaml';
  return 'text/plain';
}

/**
 * Validates a document file against the whitelist and input size cap.
 * Pure (no DOM) so it is unit-testable in bun.
 * @param file - File object with name, type, and size.
 * @returns An error string, or null when acceptable.
 */
export function validateDocumentFile(file: { name: string; type?: string; size: number }): DocumentValidationError {
  const isMimeOk = isAllowedDocumentMime(file.type || '');
  const isExtOk = hasAllowedDocumentExtension(file.name);

  if (!isMimeOk && !isExtOk) {
    return `Unsupported document format "${file.name}". Allowed formats: PDF, Markdown, TXT, CSV, JSON, and common code files.`;
  }
  if (file.size > MAX_DOCUMENT_INPUT_BYTES) {
    return `Document exceeds the ${(MAX_DOCUMENT_INPUT_BYTES / 1_000_000).toFixed(0)} MB size limit.`;
  }
  return null;
}

/**
 * Formats raw bytes into a human-readable size string.
 * @param bytes - Size in bytes.
 * @returns A string like "42 KB" or "1.2 MB".
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Reads a document File and converts it into a wire-ready ProcessedDocument.
 * Browser-only (FileReader).
 * @param file - The document file to process.
 * @returns ProcessedDocument ready for UI file parts.
 */
export async function processDocumentFile(file: File): Promise<ProcessedDocument> {
  const mediaType = resolveDocumentMediaType(file);
  const isPdf = mediaType === 'application/pdf';

  if (isPdf) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      filename: file.name,
      mediaType: 'application/pdf',
      size: file.size,
      dataUrl,
    };
  }

  // Text-based formats (txt, md, csv, json, code):
  const rawText = await readFileAsText(file);
  let isTruncated = false;
  let textContent = rawText;

  if (textContent.length > MAX_DOCUMENT_TEXT_CHARS) {
    textContent = textContent.slice(0, MAX_DOCUMENT_TEXT_CHARS) +
      `\n\n[... Document "${file.name}" truncated at ${MAX_DOCUMENT_TEXT_CHARS.toLocaleString()} characters ...]`;
    isTruncated = true;
  }

  // Encode text as a standard base64 data URL for wire transport
  const encodedText = typeof window !== 'undefined'
    ? window.btoa(unescape(encodeURIComponent(textContent)))
    : Buffer.from(textContent, 'utf-8').toString('base64');
  const dataUrl = `data:${mediaType};base64,${encodedText}`;

  return {
    filename: file.name,
    mediaType,
    size: file.size,
    dataUrl,
    textContent,
    isTruncated,
  };
}

/** Reads a File as a base64 Data URL. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read document "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

/** Reads a File as plain text. */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(new Error(`Failed to read text from "${file.name}".`));
    reader.readAsText(file);
  });
}

/**
 * Counts all document (non-image) `file` parts in a UI message part list.
 * @param parts - Message parts array.
 * @returns Number of document attachments found.
 */
export function countDocumentParts(parts?: unknown[]): number {
  if (!Array.isArray(parts)) return 0;
  return parts.filter((p) => {
    const part = p as { type?: string; mediaType?: string };
    return (
      part?.type === 'file' &&
      typeof part.mediaType === 'string' &&
      !part.mediaType.startsWith('image/')
    );
  }).length;
}

/**
 * Counts all attachments (both images and documents) in a message part list.
 * @param parts - Message parts array.
 * @returns Total count of attached files.
 */
export function countTotalAttachmentParts(parts?: unknown[]): number {
  if (!Array.isArray(parts)) return 0;
  return parts.filter((p) => {
    const part = p as { type?: string };
    return part?.type === 'file' || part?.type === 'image';
  }).length;
}

/** A single invalid document attachment in a UI message. */
export interface DocumentPartViolation {
  index: number;
  reason: string;
}

/**
 * Validates document `file` parts against the whitelist and size limit on the server.
 * Pure and server-safe.
 * @param parts - Message parts array.
 * @returns List of violations found.
 */
export function findDocumentPartViolations(parts?: unknown[]): DocumentPartViolation[] {
  if (!Array.isArray(parts)) return [];
  const violations: DocumentPartViolation[] = [];

  parts.forEach((p, index) => {
    const part = p as { type?: string; mediaType?: string; url?: unknown; filename?: string };
    if (part?.type !== 'file' || typeof part.mediaType !== 'string' || part.mediaType.startsWith('image/')) {
      return;
    }
    const isMimeAllowed = isAllowedDocumentMime(part.mediaType);
    const isExtAllowed = part.filename ? hasAllowedDocumentExtension(part.filename) : false;

    if (!isMimeAllowed && !isExtAllowed) {
      violations.push({
        index,
        reason: `Unsupported document format "${part.filename || part.mediaType}".`,
      });
    } else if (typeof part.url === 'string' && part.url.length > MAX_DOCUMENT_DATA_URL_CHARS) {
      violations.push({
        index,
        reason: `Document "${part.filename || 'attachment'}" exceeds the size limit.`,
      });
    }
  });

  return violations;
}

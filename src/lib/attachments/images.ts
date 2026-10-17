import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_DATA_URL_CHARS,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_INPUT_BYTES,
  MAX_IMAGE_OUTPUT_BYTES,
  type AllowedImageType,
} from '@/lib/limits';

/** A processed, wire-ready image attachment. */
export interface ProcessedImage {
  /** Base64 data URL (compressed, downscaled) ready for a `file` UI part. */
  dataUrl: string;
  /** IANA media type of the encoded output (jpeg for photos, png for alpha/gif). */
  mediaType: AllowedImageType;
  /** Original filename for alt text and auto-titles. */
  filename: string;
  /** Encoded width in pixels. */
  width: number;
  /** Encoded height in pixels. */
  height: number;
}

/** Result of a synchronous attachment validation, null when the file is accepted. */
export type ImageValidationError = string | null;

/**
 * Validates a raw image file against the MIME whitelist and input size cap.
 * Pure (no DOM) so it is unit-testable in bun.
 * @param file - The file picked by the user.
 * @returns A human-readable error message, or null when the file is acceptable.
 */
export function validateImageFile(file: { type: string; size: number }): ImageValidationError {
  if (!isAllowedImageType(file.type)) {
    return `Unsupported image type "${file.type || 'unknown'}". Use JPEG, PNG, WebP, or GIF.`;
  }
  if (file.size > MAX_IMAGE_INPUT_BYTES) {
    return `Image exceeds the ${(MAX_IMAGE_INPUT_BYTES / 1_000_000).toFixed(0)} MB size limit.`;
  }
  return null;
}

/**
 * Checks whether a media type is on the image attachment whitelist.
 * @param mediaType - The IANA media type to check.
 * @returns True when the type is accepted.
 */
export function isAllowedImageType(mediaType: string): mediaType is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mediaType);
}

/**
 * Counts the image `file`/`image` parts (mediaType starting with `image/`) in a
 * UI message part list. Pure, so the server route and client share one source
 * of truth for the per-message image cap.
 * @param parts - The message parts array (or undefined for legacy messages).
 * @returns The number of image attachments found.
 */
export function countImageParts(parts?: unknown[]): number {
  if (!Array.isArray(parts)) return 0;
  return parts.filter((p) => {
    const part = p as { type?: string; mediaType?: string };
    return (
      part?.mediaType?.startsWith('image/') &&
      (part.type === 'file' || part.type === 'image')
    );
  }).length;
}

/** A single invalid image attachment in a UI message, with a human reason. */
export interface ImagePartViolation {
  /** Index of the offending part within the message's parts array. */
  index: number;
  /** Human-readable rejection reason. */
  reason: string;
}

/**
 * Validates image `file` parts in a UI message against the MIME whitelist and
 * the data-URL length gate. Pure and server-safe; the agent route uses it to
 * reject oversized or disallowed attachments with a 400 before streaming.
 * @param parts - The message parts array to inspect.
 * @returns One violation per invalid image part (empty when all are valid).
 */
export function findImagePartViolations(parts?: unknown[]): ImagePartViolation[] {
  if (!Array.isArray(parts)) return [];
  const violations: ImagePartViolation[] = [];
  parts.forEach((p, index) => {
    const part = p as { type?: string; mediaType?: string; url?: unknown };
    if (part?.type !== 'file' || typeof part.mediaType !== 'string' || !part.mediaType.startsWith('image/')) {
      return;
    }
    if (!isAllowedImageType(part.mediaType)) {
      violations.push({ index, reason: `Unsupported image type "${part.mediaType}". Use JPEG, PNG, WebP, or GIF.` });
    } else if (typeof part.url === 'string' && part.url.length > MAX_IMAGE_DATA_URL_CHARS) {
      violations.push({ index, reason: 'An image attachment exceeds the size limit.' });
    }
  });
  return violations;
}

/** Canvas-based encoder settings: jpeg for photos/webp, png for alpha-bearing formats. */
type Encoder = 'image/jpeg' | 'image/png';

/**
 * Reads an image file, downscales it to the dimension cap, and encodes it as a
 * compact data URL (jpeg by default, png when the source has transparency).
 * Iteratively lowers quality and re-scales until the output fits the size cap.
 *
 * Browser-only (canvas + FileReader). Animated GIFs collapse to their first frame.
 *
 * @param file - The image file to process.
 * @returns The processed image ready for a `file` UI part.
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  const source = await loadImage(file);
  const hasAlpha = file.type === 'image/png' || file.type === 'image/gif';
  const encoder: Encoder = hasAlpha ? 'image/png' : 'image/jpeg';

  // The base64 wire size is ~4/3 the binary size; target the char budget directly.
  const targetChars = Math.floor(MAX_IMAGE_OUTPUT_BYTES * (4 / 3));

  // First attempt at the full (capped) dimensions; re-enter with a smaller scale
  // if even the lowest quality cannot fit the budget.
  for (let dims = capDimensions(source.width, source.height); dims.width >= 64; ) {
    const result = encodeWithinBudget(source, dims, encoder, targetChars);
    if (result) return { ...result, filename: file.name };
    // Shrink by 80% and retry; the loop terminates at 64px.
    dims = { width: Math.floor(dims.width * 0.8), height: Math.floor(dims.height * 0.8) };
  }

  // Extreme fallback: the image is pathological (e.g. huge noise) — encode the
  // smallest frame we allow and accept whatever size it reaches.
  const tiny = drawScaled(source, 64, 64);
  const tinyUrl = tiny.canvas.toDataURL(encoder, 0.3);
  return {
    dataUrl: tinyUrl,
    mediaType: encoder,
    filename: file.name,
    width: tiny.width,
    height: tiny.height,
  };
}

/** Loads a File into an HTMLImageElement via an object URL. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected file could not be decoded as an image.'));
    };
    img.src = url;
  });
}

/** Caps a source dimension pair to the configured maximum pixel dimension. */
function capDimensions(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

/** Draws the source into a fresh canvas at the given dimensions. */
function drawScaled(
  source: HTMLImageElement,
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable in this browser.');
  ctx.drawImage(source, 0, 0, width, height);
  return { canvas, width, height };
}

/**
 * Encodes the source at the given dimensions, stepping quality down until the
 * data URL fits the char budget. Returns null when even the lowest quality is
 * too large (the caller then retries with smaller dimensions).
 */
function encodeWithinBudget(
  source: HTMLImageElement,
  dims: { width: number; height: number },
  encoder: Encoder,
  targetChars: number,
): { dataUrl: string; mediaType: AllowedImageType; width: number; height: number } | null {
  const drawn = drawScaled(source, dims.width, dims.height);

  // PNG quality is ignored by canvas; a single pass is enough for alpha formats.
  if (encoder === 'image/png') {
    const dataUrl = drawn.canvas.toDataURL('image/png');
    return dataUrl.length <= targetChars
      ? { dataUrl, mediaType: 'image/png', width: drawn.width, height: drawn.height }
      : null;
  }

  for (let quality = 0.85; quality >= 0.3; quality -= 0.15) {
    const dataUrl = drawn.canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= targetChars) {
      return { dataUrl, mediaType: 'image/jpeg', width: drawn.width, height: drawn.height };
    }
  }
  return null;
}
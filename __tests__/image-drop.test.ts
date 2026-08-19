import { describe, it, expect } from 'bun:test';
import {
  validateImageFile,
  isAllowedImageType,
  countImageParts,
  findImagePartViolations,
} from '@/lib/image-utils';
import { MAX_IMAGE_INPUT_BYTES } from '@/lib/limits';

describe('Image Drop & Validation Unit Tests', () => {
  describe('isAllowedImageType', () => {
    it('accepts valid JPEG, PNG, WebP, and GIF images', () => {
      expect(isAllowedImageType('image/jpeg')).toBe(true);
      expect(isAllowedImageType('image/png')).toBe(true);
      expect(isAllowedImageType('image/webp')).toBe(true);
      expect(isAllowedImageType('image/gif')).toBe(true);
    });

    it('rejects disallowed MIME types', () => {
      expect(isAllowedImageType('application/pdf')).toBe(false);
      expect(isAllowedImageType('text/plain')).toBe(false);
      expect(isAllowedImageType('image/svg+xml')).toBe(false);
      expect(isAllowedImageType('image/bmp')).toBe(false);
      expect(isAllowedImageType('video/mp4')).toBe(false);
    });
  });

  describe('validateImageFile', () => {
    it('accepts files within the 5MB size limit', () => {
      const validFile = { type: 'image/jpeg', size: 1024 * 1024 * 2 };
      expect(validateImageFile(validFile)).toBeNull();
    });

    it('rejects oversized files exceeding the 5MB size limit', () => {
      const oversizedFile = { type: 'image/png', size: MAX_IMAGE_INPUT_BYTES + 1 };
      const error = validateImageFile(oversizedFile);
      expect(error).toContain('exceeds the 5 MB size limit');
    });

    it('rejects unsupported image MIME types with a clear message', () => {
      const invalidFile = { type: 'application/pdf', size: 1000 };
      const error = validateImageFile(invalidFile);
      expect(error).toContain('Unsupported image type "application/pdf"');
      expect(error).toContain('Use JPEG, PNG, WebP, or GIF');
    });

    it('handles files with missing or empty MIME type gracefully', () => {
      const unknownFile = { type: '', size: 500 };
      const error = validateImageFile(unknownFile);
      expect(error).toContain('Unsupported image type "unknown"');
    });
  });

  describe('countImageParts', () => {
    it('counts valid image parts correctly', () => {
      const parts = [
        { type: 'text', text: 'Hello' },
        { type: 'file', mediaType: 'image/png', url: 'data:image/png;base64,...' },
        { type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,...' },
        { type: 'tool-call', toolName: 'webSearch' },
      ];
      expect(countImageParts(parts)).toBe(2);
    });

    it('returns 0 for empty or undefined parts arrays', () => {
      expect(countImageParts([])).toBe(0);
      expect(countImageParts(undefined)).toBe(0);
    });
  });

  describe('findImagePartViolations', () => {
    it('detects disallowed image MIME types in message parts', () => {
      const parts = [
        { type: 'file', mediaType: 'image/svg+xml', url: 'data:image/svg+xml;base64,...' },
      ];
      const violations = findImagePartViolations(parts);
      expect(violations.length).toBe(1);
      expect(violations[0].reason).toContain('Unsupported image type');
    });

    it('returns empty violations when all image parts are valid', () => {
      const parts = [
        { type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,...' },
        { type: 'file', mediaType: 'image/png', url: 'data:image/png;base64,...' },
      ];
      const violations = findImagePartViolations(parts);
      expect(violations.length).toBe(0);
    });
  });
});

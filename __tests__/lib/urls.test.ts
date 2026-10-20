import { describe, it, expect } from 'bun:test';
import {
  getGoogleFaviconUrl,
  extractDomain,
  extractWebSourcesFromMessage,
} from '@/lib/urls';

describe('urls utility', () => {
  describe('getGoogleFaviconUrl', () => {
    it('generates a Google S2 favicon URL for a valid URL', () => {
      const url = 'https://nextjs.org/docs/app';
      const result = getGoogleFaviconUrl(url);
      expect(result).toBe('https://www.google.com/s2/favicons?domain=nextjs.org&sz=32');
    });

    it('respects custom icon sizes', () => {
      const url = 'https://github.com';
      const result = getGoogleFaviconUrl(url, 64);
      expect(result).toBe('https://www.google.com/s2/favicons?domain=github.com&sz=64');
    });

    it('returns an empty string for invalid URLs', () => {
      expect(getGoogleFaviconUrl('')).toBe('');
      expect(getGoogleFaviconUrl('not a url')).toBe('');
    });
  });

  describe('extractDomain', () => {
    it('extracts the domain and strips www prefix', () => {
      expect(extractDomain('https://www.wikipedia.org/wiki/AI')).toBe('wikipedia.org');
      expect(extractDomain('http://subdomain.example.com/path?query=1')).toBe('subdomain.example.com');
      expect(extractDomain('https://nextjs.org')).toBe('nextjs.org');
    });

    it('falls back gracefully on non-URL strings', () => {
      expect(extractDomain('not-a-url')).toBe('not-a-url');
    });
  });

  describe('extractWebSourcesFromMessage', () => {
    it('returns an empty array when message has no parts', () => {
      expect(extractWebSourcesFromMessage({})).toEqual([]);
      expect(extractWebSourcesFromMessage({ parts: [] })).toEqual([]);
    });

    it('extracts unique sources from webSearch tool results', () => {
      const message = {
        parts: [
          {
            type: 'text',
            text: 'Here are the latest updates.',
          },
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolName: 'webSearch',
              result: {
                success: true,
                results: [
                  {
                    title: 'Next.js 16 Released',
                    url: 'https://nextjs.org/blog/next-16',
                    favicon: 'https://nextjs.org/favicon.ico',
                  },
                  {
                    title: 'Vercel Changelog',
                    url: 'https://vercel.com/changelog',
                  },
                ],
              },
            },
          },
        ],
      };

      const sources = extractWebSourcesFromMessage(message);
      expect(sources).toHaveLength(2);
      expect(sources[0]).toEqual({
        title: 'Next.js 16 Released',
        url: 'https://nextjs.org/blog/next-16',
        favicon: 'https://nextjs.org/favicon.ico',
      });
      expect(sources[1]).toEqual({
        title: 'Vercel Changelog',
        url: 'https://vercel.com/changelog',
        favicon: undefined,
      });
    });

    it('extracts unique sources from extractUrl tool results', () => {
      const message = {
        parts: [
          {
            type: 'tool-extractUrl',
            result: {
              success: true,
              extracted: [
                {
                  title: 'Fetch API - MDN',
                  url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
                  favicon: 'https://developer.mozilla.org/favicon.png',
                },
              ],
            },
          },
        ],
      };

      const sources = extractWebSourcesFromMessage(message);
      expect(sources).toHaveLength(1);
      expect(sources[0].title).toBe('Fetch API - MDN');
      expect(sources[0].url).toBe('https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API');
      expect(sources[0].favicon).toBe('https://developer.mozilla.org/favicon.png');
    });

    it('deduplicates identical URLs across multiple search and extract invocations', () => {
      const message = {
        parts: [
          {
            type: 'tool',
            toolInvocation: {
              toolName: 'webSearch',
              result: {
                results: [
                  { title: 'Next.js', url: 'https://nextjs.org' },
                ],
              },
            },
          },
          {
            type: 'tool',
            toolInvocation: {
              toolName: 'extractUrl',
              result: {
                extracted: [
                  { title: 'Next.js Homepage', url: 'https://nextjs.org' },
                ],
              },
            },
          },
        ],
      };

      const sources = extractWebSourcesFromMessage(message);
      expect(sources).toHaveLength(1);
      expect(sources[0].url).toBe('https://nextjs.org');
    });
  });
});

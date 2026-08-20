import type { MetadataRoute } from 'next';

/**
 * Dynamic sitemap.xml configuration for Strata AI.
 * Surfaces public discoverable routes to search engine crawlers with priority weights.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://strata-ai-five.vercel.app';
  const lastModified = new Date();

  return [
    {
      url: `${baseUrl}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/auth/signin`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}

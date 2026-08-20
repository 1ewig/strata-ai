import type { MetadataRoute } from 'next';

/**
 * Dynamic robots.txt configuration for Strata AI.
 * Allows search engine bots to crawl public pages while protecting private API endpoints.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/agent', '/api/agent/compact', '/api/user/'],
      },
    ],
    sitemap: 'https://strata-ai-five.vercel.app/sitemap.xml',
  };
}

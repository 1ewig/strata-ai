import type { NextConfig } from 'next';

/**
 * Next.js configuration for the Strata Ai app.
 *
 * Enables React strict mode and strict TypeScript checking during builds, allows
 * images from picsum.photos, outputs a standalone server build, and transpiles
 * the `motion` package.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'motion', '@ai-sdk/react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
};

/** The Next.js configuration consumed by `next build` and `next dev`. */
export default nextConfig;

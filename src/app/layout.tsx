import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { RateLimitProvider } from '@/contexts/RateLimitContext';
import { auth } from '@/lib/auth';
import { getRateLimitStatus, RateLimitResult } from '@/lib/rate-limit';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

/** Mobile viewport config: device-width scale with resizable interactive widgets. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: 'resizes-visual',
};

const SITE_URL = 'https://strata-ai-five.vercel.app';
const SITE_TITLE = 'Strata AI - The Agentic Workshop & Document Studio';
const SITE_DESCRIPTION =
  'The workshop for thought that outlasts the chat. Create, edit, and orchestrate living Markdown documents with local-first agent tools, real-time web research, and surgical context compaction.';

/** Comprehensive document metadata for search indexing and social graph previews. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | Strata AI',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'Strata AI',
  keywords: [
    'Strata AI',
    'AI workspace',
    'agentic document studio',
    'markdown editor',
    'context compaction',
    'Google Gemini 3.5',
    'DeepSeek V4',
    'Tavily web search',
    'local-first AI',
    'AI pair programmer',
  ],
  authors: [{ name: 'Strata AI Studio' }],
  creator: 'Strata AI',
  publisher: 'Strata AI',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Strata AI',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/icon.svg',
        width: 512,
        height: 512,
        alt: 'Strata AI - Agentic Workspace & Document Studio',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    creator: '@strata_ai',
    images: ['/icon.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: '9J08ynnXmMMnmafKEStxv7Gq74qqsfqFc28ayctn-HU',
  },
};

/** Schema.org structured data for WebApplication */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Strata AI',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'BusinessApplication, Productivity',
  operatingSystem: 'All modern web browsers',
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Local-first document workspace',
    'Surgical Markdown file operations',
    'Continuous context compaction and state preservation',
    'Real-time neural web search with Tavily',
    'Multimodal image vision reasoning with Google Gemini',
  ],
};

/**
 * Root layout wrapping the app in the theme, fonts, rate-limit provider, and SEO JSON-LD.
 * Resolves the user's rate-limit quota server-side so the provider can
 * hydrate with data instead of fetching after mount.
 *
 * @param children - Page content rendered inside the app shell
 * @returns The HTML document for the application
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialRateLimit: RateLimitResult | null = null;
  // Resolve the signed-in user's quota before rendering so the provider hydrates with real data.
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (session?.user) {
      initialRateLimit = await getRateLimitStatus(session.user.id);
    }
  } catch {
    // fallback if session or database connection is unavailable during build/SSR
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="9J08ynnXmMMnmafKEStxv7Gq74qqsfqFc28ayctn-HU" />
        {/* Schema.org Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Apply the saved theme (or OS preference) before React hydrates to avoid a theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('strata-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.classList.remove('dark');document.documentElement.removeAttribute('data-theme');}}catch(e){document.documentElement.classList.remove('dark');document.documentElement.removeAttribute('data-theme');}})()`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${plusJakartaSans.variable} bg-surface-base text-text-primary antialiased selection:bg-primary/20 selection:text-text-bright relative font-sans`}
      >
        <RateLimitProvider initialData={initialRateLimit}>{children}</RateLimitProvider>
      </body>
    </html>
  );
}

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

/** Default document metadata for the app. */
export const metadata: Metadata = {
  title: 'Strata AI - Agentic Workspace & Document Studio',
  description: 'Create, edit, and orchestrate documents with AI tools and live workspace canvas',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

/**
 * Root layout wrapping the app in the theme, fonts, and rate-limit provider.
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
        {/* Apply the saved theme (or OS preference) before React hydrates to avoid a theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('strata-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){document.documentElement.classList.remove('dark')}})()`,
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

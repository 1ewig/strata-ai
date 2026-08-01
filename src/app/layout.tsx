import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Fredoka, Nunito } from 'next/font/google';
import './globals.css';
import { RateLimitProvider } from '@/contexts/RateLimitContext';
import { auth } from '@/lib/auth';
import { getRateLimitStatus, RateLimitResult } from '@/lib/rate-limit';

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: 'resizes-visual',
};

export const metadata: Metadata = {
  title: 'Strata AI - Agentic Workspace & Document Studio',
  description: 'Create, edit, and orchestrate documents with AI tools and live workspace canvas',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialRateLimit: RateLimitResult | null = null;
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('strata-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){document.documentElement.classList.remove('dark')}})()`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${fredoka.variable} ${nunito.variable} bg-surface-base text-text-primary antialiased selection:bg-secondary selection:text-dark relative font-sans`}
      >
        <RateLimitProvider initialData={initialRateLimit}>{children}</RateLimitProvider>
      </body>
    </html>
  );
}

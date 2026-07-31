import type { Metadata } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import './globals.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Strata AI - Agentic Workspace & Document Studio',
  description: 'Create, edit, and orchestrate documents with AI tools and live workspace canvas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        {children}
      </body>
    </html>
  );
}

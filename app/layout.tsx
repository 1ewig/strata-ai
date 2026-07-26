import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Strata AI - Agentic Workspace & Document Studio',
  description: 'Create, edit, and orchestrate documents with AI tools and live workspace canvas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="bg-surface-base text-text-primary antialiased selection:bg-emerald-500/20 selection:text-emerald-300 relative">
        {children}
      </body>
    </html>
  );
}

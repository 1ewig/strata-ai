import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResumeFlow - AI Resume Tailoring Agent',
  description: 'Parse, organize, and polish your resume with AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

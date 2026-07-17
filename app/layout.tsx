import type {Metadata} from 'next';
import './globals.css';
import {ResumeProvider} from '@/contexts/ResumeContext';

export const metadata: Metadata = {
  title: 'ResumeFlow - AI Resume Tailoring Agent',
  description: 'Parse, organize, and polish your resume with AI',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ResumeProvider>{children}</ResumeProvider>
      </body>
    </html>
  );
}

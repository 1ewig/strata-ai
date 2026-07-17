'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BrainCircuit } from 'lucide-react';
import { useResumes } from '@/contexts/ResumeContext';
import ResumeDetail from '@/components/resumes/ResumeDetail';

export default function ResumeSlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const {
    resumes,
    handleUpdateResume,
    handleAddSection,
    handleUpdateSection,
    handleDeleteSection,
    handleAgentUpdateResumes,
  } = useResumes();
  const [isParsing, setIsParsing] = useState(false);

  const resume = resumes.find(r => r.slug === slug);

  const handleParse = async () => {
    if (!resume || !resume.rawText || isParsing) return;
    setIsParsing(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Parse this resume text into standard sections and call replaceSections to store them. Resume ID is "${resume.id}".\n\n${resume.rawText}`,
            },
          ],
          resumes: [resume],
          model: 'gemini-2.0-flash',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse resume');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResumes: any[] | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop()!;

        for (const part of parts) {
          const dataLine = part.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;
          const data = JSON.parse(dataLine.slice(6));
          if (data.resumes) {
            finalResumes = data.resumes;
          }
        }
      }

      if (finalResumes) {
        handleAgentUpdateResumes(finalResumes as any);
      }
    } catch (e) {
      console.error('Parse error:', e);
    } finally {
      setIsParsing(false);
    }
  };

  if (!resume) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
          <BrainCircuit className="w-6 h-6 text-zinc-500" />
        </div>
        <h1 className="text-xl font-bold text-zinc-300">Resume not found</h1>
        <p className="text-sm text-zinc-500">The resume you are looking for does not exist.</p>
        <button
          onClick={() => router.push('/resumes')}
          className="flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Resumes
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">

      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push('/resumes')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Resumes
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-zinc-950" />
            </div>
            <span className="text-sm font-bold text-zinc-100">ResumeFlow</span>
          </div>
        </div>
      </header>

      <div className="flex-grow max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <ResumeDetail
          resume={resume}
          onUpdateResume={handleUpdateResume}
          onAddSection={handleAddSection}
          onUpdateSection={handleUpdateSection}
          onDeleteSection={handleDeleteSection}
          onParse={handleParse}
          isParsing={isParsing}
        />
      </div>

    </main>
  );
}

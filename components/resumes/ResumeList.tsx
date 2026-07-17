'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { FileText, Plus } from 'lucide-react';
import { Resume } from '@/lib/schemas';
import ResumeCard from './ResumeCard';
import ResumeForm from './ResumeForm';

interface ResumeListProps {
  resumes: Resume[];
  onAddResume: (title: string, rawText: string) => void;
  onDeleteResume: (id: string) => void;
}

export default function ResumeList({ resumes, onAddResume, onDeleteResume }: ResumeListProps) {
  const router = useRouter();
  const [isNewOpen, setIsNewOpen] = useState(false);

  const handleFormSubmit = (title: string, rawText: string) => {
    onAddResume(title, rawText);
    setIsNewOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            My Resumes
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {resumes.length > 0
              ? `${resumes.length} resume${resumes.length !== 1 ? 's' : ''} — ${resumes.reduce((s, r) => s + r.sections.length, 0)} total sections`
              : 'Paste a resume to get started, or ask the AI to help craft one.'}
          </p>
        </div>
        <button
          onClick={() => setIsNewOpen(!isNewOpen)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all focus:outline-none ${
            isNewOpen
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          {isNewOpen ? 'Cancel' : 'New Resume'}
          <Plus className={`w-3.5 h-3.5 transition-transform duration-300 ${isNewOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {isNewOpen && (
          <ResumeForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsNewOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="relative min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {resumes.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {resumes.map(resume => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  onClick={() => router.push('/resumes/' + resume.slug)}
                  onDelete={onDeleteResume}
                />
              ))}
            </div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl p-12 text-center bg-zinc-950/20"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-zinc-600 border border-zinc-800">
                <FileText className="w-5 h-5 text-zinc-500" />
              </div>
              <h4 className="text-zinc-300 font-semibold text-base">No resumes yet</h4>
              <p className="text-sm text-zinc-500 max-w-sm mt-1 mb-5">
                Paste your resume text and let the AI parse it into organized sections you can edit individually.
              </p>
              <button
                onClick={() => setIsNewOpen(true)}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
              >
                Add Your Resume
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

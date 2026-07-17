'use client';

import React, { createContext, useContext } from 'react';
import { Resume } from '@/lib/schemas';
import { useResumeCrud } from '@/hooks/useResumeCrud';

interface ResumeContextType {
  resumes: Resume[];
  handleAddResume: (title: string, rawText: string, sections?: { type: string; title: string; content: string }[]) => Resume;
  handleUpdateResume: (id: string, title?: string, rawText?: string) => void;
  handleDeleteResume: (id: string) => void;
  handleAddSection: (resumeId: string, type: string, title: string, content: string) => void;
  handleUpdateSection: (resumeId: string, sectionId: string, title?: string, content?: string) => void;
  handleDeleteSection: (resumeId: string, sectionId: string) => void;
  handleAgentUpdateResumes: (newResumes: Resume[]) => void;
  resumeCount: number;
  totalSections: number;
}

const ResumeContext = createContext<ResumeContextType | null>(null);

export function ResumeProvider({ children }: { children: React.ReactNode }) {
  const ctx = useResumeCrud();
  return <ResumeContext.Provider value={ctx}>{children}</ResumeContext.Provider>;
}

export function useResumes() {
  const context = useContext(ResumeContext);
  if (!context) throw new Error('useResumes must be used within ResumeProvider');
  return context;
}

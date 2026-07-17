'use client';

import { useState, useEffect } from "react";
import { Resume, ResumeSection } from "@/lib/schemas";
import { getStoredResumes, saveResumes } from "@/lib/data/storage";
import { generateId } from "@/lib/id";
import { generateUniqueSlug } from "@/lib/slug";

export function useResumeCrud() {
  const [resumes, setResumes] = useState<Resume[]>([]);

  useEffect(() => {
    const loaded = getStoredResumes();
    setTimeout(() => {
      setResumes(loaded);
    }, 0);
  }, []);

  const handleSaveResumes = (updated: Resume[]) => {
    setResumes(updated);
    saveResumes(updated);
  };

  const handleAddResume = (title: string, rawText: string, sections?: { type: string; title: string; content: string }[]) => {
    const now = new Date().toISOString();
    const sectionItems: ResumeSection[] = (sections || []).map((s, i) => ({
      id: generateId(),
      type: s.type,
      title: s.title,
      content: s.content,
      order: i,
    }));

    const newResume: Resume = {
      id: generateId(),
      slug: generateUniqueSlug(title, resumes),
      title: title.trim(),
      rawText,
      sections: sectionItems,
      createdAt: now,
      updatedAt: now,
    };

    handleSaveResumes([...resumes, newResume]);
    return newResume;
  };

  const handleUpdateResume = (id: string, title?: string, rawText?: string) => {
    const updated = resumes.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        ...(title !== undefined && { title }),
        ...(rawText !== undefined && { rawText }),
        updatedAt: new Date().toISOString(),
      };
    });
    handleSaveResumes(updated);
  };

  const handleDeleteResume = (id: string) => {
    handleSaveResumes(resumes.filter(r => r.id !== id));
  };

  const handleAddSection = (resumeId: string, type: string, title: string, content: string) => {
    const updated = resumes.map(r => {
      if (r.id !== resumeId) return r;
      const newSection: ResumeSection = {
        id: generateId(),
        type,
        title,
        content,
        order: r.sections.length,
      };
      return {
        ...r,
        sections: [...r.sections, newSection],
        updatedAt: new Date().toISOString(),
      };
    });
    handleSaveResumes(updated);
  };

  const handleUpdateSection = (resumeId: string, sectionId: string, title?: string, content?: string) => {
    const updated = resumes.map(r => {
      if (r.id !== resumeId) return r;
      const sectionsCopy = r.sections.map(s => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
        };
      });
      return {
        ...r,
        sections: sectionsCopy,
        updatedAt: new Date().toISOString(),
      };
    });
    handleSaveResumes(updated);
  };

  const handleDeleteSection = (resumeId: string, sectionId: string) => {
    const updated = resumes.map(r => {
      if (r.id !== resumeId) return r;
      return {
        ...r,
        sections: r.sections.filter(s => s.id !== sectionId),
        updatedAt: new Date().toISOString(),
      };
    });
    handleSaveResumes(updated);
  };

  const handleAgentUpdateResumes = (newResumes: Resume[]) => {
    handleSaveResumes(newResumes);
  };

  const resumeCount = resumes.length;
  const totalSections = resumes.reduce((acc, r) => acc + r.sections.length, 0);

  return {
    resumes,
    handleAddResume,
    handleUpdateResume,
    handleDeleteResume,
    handleAddSection,
    handleUpdateSection,
    handleDeleteSection,
    handleAgentUpdateResumes,
    resumeCount,
    totalSections,
  };
}

import { Type, FunctionDeclaration } from "@google/genai";
import { Resume, ResumeSection } from "../schemas";
import { generateId } from "../id";
import { toSlug } from "../slug";

export const addResumeTool: FunctionDeclaration = {
  name: "addResume",
  description: "Create a new resume entry with an optional array of parsed sections (type, title, content).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Resume title, e.g. 'John Doe — Software Engineer'" },
      rawText: { type: Type.STRING, description: "The original plain text of the resume" },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "Section type: summary, experience, education, skills, projects, certifications, languages, or custom" },
            title: { type: Type.STRING, description: "Section heading as it appears in the resume" },
            content: { type: Type.STRING, description: "Full section content in plain text or markdown" },
          },
          required: ["type", "title", "content"],
        },
        description: "Array of parsed sections extracted from the raw text",
      },
    },
    required: ["title", "rawText", "sections"],
  },
};

export const updateSectionTool: FunctionDeclaration = {
  name: "updateSection",
  description: "Update the content and/or title of a specific section within a resume, without replacing the whole file.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resumeId: { type: Type.STRING, description: "The ID of the resume containing the section" },
      sectionId: { type: Type.STRING, description: "The ID of the section to update" },
      title: { type: Type.STRING, description: "New title for the section (optional)" },
      content: { type: Type.STRING, description: "New content for the section (optional)" },
    },
    required: ["resumeId", "sectionId"],
  },
};

export const addSectionTool: FunctionDeclaration = {
  name: "addSection",
  description: "Append a new section to an existing resume.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resumeId: { type: Type.STRING, description: "The ID of the resume to add the section to" },
      type: { type: Type.STRING, description: "Section type: summary, experience, education, skills, projects, certifications, languages, or custom" },
      title: { type: Type.STRING, description: "Section heading" },
      content: { type: Type.STRING, description: "Section content in plain text or markdown" },
    },
    required: ["resumeId", "type", "title", "content"],
  },
};

export const deleteSectionTool: FunctionDeclaration = {
  name: "deleteSection",
  description: "Remove a section from a resume.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resumeId: { type: Type.STRING, description: "The ID of the resume containing the section" },
      sectionId: { type: Type.STRING, description: "The ID of the section to delete" },
    },
    required: ["resumeId", "sectionId"],
  },
};

export const getResumeTool: FunctionDeclaration = {
  name: "getResume",
  description: "Retrieve the full resume JSON including all sections.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resumeId: { type: Type.STRING, description: "The ID of the resume to get" },
    },
    required: ["resumeId"],
  },
};

export const replaceSectionsTool: FunctionDeclaration = {
  name: "replaceSections",
  description: "Replace all sections of a resume with a new set of sections. Used when re-parsing or restructuring an entire resume.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resumeId: { type: Type.STRING, description: "The ID of the resume to update" },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "Section type" },
            title: { type: Type.STRING, description: "Section heading" },
            content: { type: Type.STRING, description: "Section content" },
          },
          required: ["type", "title", "content"],
        },
        description: "New array of sections to replace existing ones",
      },
    },
    required: ["resumeId", "sections"],
  },
};

export const renameResumeTool: FunctionDeclaration = {
  name: "renameResume",
  description: "Rename a resume without changing its slug or sections.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resumeId: { type: Type.STRING, description: "The ID of the resume to rename" },
      title: { type: Type.STRING, description: "New title for the resume" },
    },
    required: ["resumeId", "title"],
  },
};

export const duplicateResumeTool: FunctionDeclaration = {
  name: "duplicateResume",
  description: "Duplicate an entire resume including all its sections, creating a fresh copy with a new ID and slug.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resumeId: { type: Type.STRING, description: "The ID of the resume to duplicate" },
    },
    required: ["resumeId"],
  },
};

export const reorderSectionsTool: FunctionDeclaration = {
  name: "reorderSections",
  description: "Reorder the sections of a resume by providing the section IDs in the desired order.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resumeId: { type: Type.STRING, description: "The ID of the resume whose sections to reorder" },
      sectionIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Array of section IDs in the desired order",
      },
    },
    required: ["resumeId", "sectionIds"],
  },
};

export const deleteResumeTool: FunctionDeclaration = {
  name: "deleteResume",
  description: "Delete an entire resume and all its sections.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resumeId: { type: Type.STRING, description: "The ID of the resume to delete" },
    },
    required: ["resumeId"],
  },
};

export const ALL_TOOLS: FunctionDeclaration[] = [
  addResumeTool,
  updateSectionTool,
  addSectionTool,
  deleteSectionTool,
  replaceSectionsTool,
  renameResumeTool,
  duplicateResumeTool,
  reorderSectionsTool,
  deleteResumeTool,
  getResumeTool,
];

export function executeTool(
  name: string,
  args: any,
  resumes: Resume[]
): { result: any; updatedResumes: Resume[]; updated: boolean } {
  let updated = false;
  let updatedResumes = [...resumes];
  let result: any = null;

  switch (name) {
    case "addResume": {
      const sections: ResumeSection[] = (args.sections || []).map((s: any, i: number) => ({
        id: generateId(),
        type: s.type || "custom",
        title: s.title || "Untitled Section",
        content: s.content || "",
        order: s.order ?? i,
      }));

      const now = new Date().toISOString();
      const newResume: Resume = {
        id: generateId(),
        slug: `${toSlug(args.title || "Untitled")}-${generateId().slice(0, 6)}`,
        title: args.title || "Untitled Resume",
        rawText: args.rawText || "",
        sections,
        createdAt: now,
        updatedAt: now,
      };

      updatedResumes.push(newResume);
      result = {
        status: "success",
        message: `Created resume "${newResume.title}" with ${sections.length} sections.`,
        resume: newResume,
      };
      updated = true;
      break;
    }

    case "updateSection": {
      const resumeIndex = updatedResumes.findIndex(r => r.id === args.resumeId);
      if (resumeIndex === -1) {
        result = { status: "error", message: `Resume with ID ${args.resumeId} not found.` };
        break;
      }
      const resume = updatedResumes[resumeIndex];
      const sectionIndex = resume.sections.findIndex(s => s.id === args.sectionId);
      if (sectionIndex === -1) {
        result = { status: "error", message: `Section with ID ${args.sectionId} not found in resume.` };
        break;
      }

      const updatedSection = {
        ...resume.sections[sectionIndex],
        ...(args.title !== undefined && { title: args.title }),
        ...(args.content !== undefined && { content: args.content }),
      };

      const sectionsCopy = [...resume.sections];
      sectionsCopy[sectionIndex] = updatedSection;

      updatedResumes[resumeIndex] = {
        ...resume,
        sections: sectionsCopy,
        updatedAt: new Date().toISOString(),
      };

      result = {
        status: "success",
        message: `Updated section "${updatedSection.title}" in resume "${resume.title}".`,
        section: updatedSection,
      };
      updated = true;
      break;
    }

    case "addSection": {
      const resumeIndex = updatedResumes.findIndex(r => r.id === args.resumeId);
      if (resumeIndex === -1) {
        result = { status: "error", message: `Resume with ID ${args.resumeId} not found.` };
        break;
      }
      const resume = updatedResumes[resumeIndex];
      const newSection: ResumeSection = {
        id: generateId(),
        type: args.type || "custom",
        title: args.title || "Untitled Section",
        content: args.content || "",
        order: resume.sections.length,
      };

      updatedResumes[resumeIndex] = {
        ...resume,
        sections: [...resume.sections, newSection],
        updatedAt: new Date().toISOString(),
      };

      result = {
        status: "success",
        message: `Added section "${newSection.title}" to resume "${resume.title}".`,
        section: newSection,
      };
      updated = true;
      break;
    }

    case "deleteSection": {
      const resumeIndex = updatedResumes.findIndex(r => r.id === args.resumeId);
      if (resumeIndex === -1) {
        result = { status: "error", message: `Resume with ID ${args.resumeId} not found.` };
        break;
      }
      const resume = updatedResumes[resumeIndex];
      const deletedSection = resume.sections.find(s => s.id === args.sectionId);
      if (!deletedSection) {
        result = { status: "error", message: `Section with ID ${args.sectionId} not found in resume.` };
        break;
      }

      updatedResumes[resumeIndex] = {
        ...resume,
        sections: resume.sections.filter(s => s.id !== args.sectionId),
        updatedAt: new Date().toISOString(),
      };

      result = {
        status: "success",
        message: `Deleted section "${deletedSection.title}" from resume "${resume.title}".`,
      };
      updated = true;
      break;
    }

    case "replaceSections": {
      const resumeIndex = updatedResumes.findIndex(r => r.id === args.resumeId);
      if (resumeIndex === -1) {
        result = { status: "error", message: `Resume with ID ${args.resumeId} not found.` };
        break;
      }
      const resume = updatedResumes[resumeIndex];
      const newSections: ResumeSection[] = (args.sections || []).map((s: any, i: number) => ({
        id: generateId(),
        type: s.type || "custom",
        title: s.title || "Untitled Section",
        content: s.content || "",
        order: i,
      }));

      updatedResumes[resumeIndex] = {
        ...resume,
        sections: newSections,
        updatedAt: new Date().toISOString(),
      };

      result = {
        status: "success",
        message: `Replaced resume sections with ${newSections.length} new sections.`,
        resume: updatedResumes[resumeIndex],
      };
      updated = true;
      break;
    }

    case "getResume": {
      const found = updatedResumes.find(r => r.id === args.resumeId);
      result = found
        ? { status: "success", resume: found }
        : { status: "error", message: `Resume with ID ${args.resumeId} not found.` };
      break;
    }

    case "renameResume": {
      const resumeIndex = updatedResumes.findIndex(r => r.id === args.resumeId);
      if (resumeIndex === -1) {
        result = { status: "error", message: `Resume with ID ${args.resumeId} not found.` };
        break;
      }
      updatedResumes[resumeIndex] = {
        ...updatedResumes[resumeIndex],
        title: args.title,
        updatedAt: new Date().toISOString(),
      };
      result = {
        status: "success",
        message: `Renamed resume to "${args.title}".`,
        resume: updatedResumes[resumeIndex],
      };
      updated = true;
      break;
    }

    case "duplicateResume": {
      const source = updatedResumes.find(r => r.id === args.resumeId);
      if (!source) {
        result = { status: "error", message: `Resume with ID ${args.resumeId} not found.` };
        break;
      }
      const now = new Date().toISOString();
      const newSlug = `${toSlug(source.title)}-${generateId().slice(0, 6)}`;
      const duplicate: Resume = {
        ...source,
        id: generateId(),
        slug: newSlug,
        title: `${source.title} (Copy)`,
        sections: source.sections.map(s => ({
          ...s,
          id: generateId(),
        })),
        createdAt: now,
        updatedAt: now,
      };
      updatedResumes.push(duplicate);
      result = {
        status: "success",
        message: `Duplicated resume "${source.title}" as "${duplicate.title}".`,
        resume: duplicate,
      };
      updated = true;
      break;
    }

    case "reorderSections": {
      const resumeIndex = updatedResumes.findIndex(r => r.id === args.resumeId);
      if (resumeIndex === -1) {
        result = { status: "error", message: `Resume with ID ${args.resumeId} not found.` };
        break;
      }
      const resume = updatedResumes[resumeIndex];
      const ids: string[] = args.sectionIds || [];
      const sectionMap = new Map(resume.sections.map(s => [s.id, s]));
      const missing = ids.filter(id => !sectionMap.has(id));
      if (missing.length > 0) {
        result = { status: "error", message: `Section IDs not found: ${missing.join(', ')}` };
        break;
      }
      const reordered = ids.map((id, i) => ({
        ...sectionMap.get(id)!,
        order: i,
      }));
      updatedResumes[resumeIndex] = {
        ...resume,
        sections: reordered,
        updatedAt: new Date().toISOString(),
      };
      result = {
        status: "success",
        message: `Reordered ${reordered.length} sections in resume "${resume.title}".`,
        resume: updatedResumes[resumeIndex],
      };
      updated = true;
      break;
    }

    case "deleteResume": {
      const resumeIndex = updatedResumes.findIndex(r => r.id === args.resumeId);
      if (resumeIndex === -1) {
        result = { status: "error", message: `Resume with ID ${args.resumeId} not found.` };
        break;
      }
      const deleted = updatedResumes[resumeIndex];
      updatedResumes.splice(resumeIndex, 1);
      result = {
        status: "success",
        message: `Deleted resume "${deleted.title}".`,
        title: deleted.title,
      };
      updated = true;
      break;
    }

    default:
      result = { status: "error", message: `Unknown tool execution: ${name}` };
  }

  return { result, updatedResumes, updated };
}

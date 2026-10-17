import React from 'react';
import { FileText, FileSpreadsheet, FileJson, FileCode2 } from 'lucide-react';

export interface DocumentIconProps {
  mediaType: string;
  filename: string;
  className?: string;
}

/**
 * Reusable icon component rendering the appropriate semantic icon
 * and Milo color tokens based on file extension and media type.
 */
export function DocumentIcon({ mediaType, filename, className = 'w-4 h-4 shrink-0' }: DocumentIconProps) {
  const lower = filename.toLowerCase();
  if (mediaType === 'application/pdf' || lower.endsWith('.pdf')) {
    return <FileText className={`${className} text-primary`} />;
  }
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
    return <FileSpreadsheet className={`${className} text-secondary`} />;
  }
  if (lower.endsWith('.json')) {
    return <FileJson className={`${className} text-info`} />;
  }
  if (
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.js') ||
    lower.endsWith('.jsx') ||
    lower.endsWith('.py') ||
    lower.endsWith('.html') ||
    lower.endsWith('.css') ||
    lower.endsWith('.sql') ||
    lower.endsWith('.rs') ||
    lower.endsWith('.go')
  ) {
    return <FileCode2 className={`${className} text-secondary`} />;
  }
  return <FileText className={`${className} text-text-secondary`} />;
}

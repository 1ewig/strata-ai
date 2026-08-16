import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';

interface SidebarHeaderProps {
  /** Callback invoked when the mobile drawer should close. */
  onClose?: () => void;
}

/**
 * Brand header for the sidebar displaying the Strata AI logo, title,
 * and a mobile close button.
 */
function SidebarHeader({ onClose }: SidebarHeaderProps) {
  return (
    <div className="h-14 px-4 border-b border-edge-hover/50 flex items-center justify-between gap-2.5 shrink-0">
      <Link href="/" className="group flex items-center gap-2.5 hover:opacity-90 transition-opacity">
        <StrataIcon className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform duration-200" />
        <h1 className="text-label font-display font-bold tracking-tight text-text-bright">Strata AI</h1>
      </Link>
      <button
        onClick={onClose}
        className="md:hidden p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-elevated active:scale-90 rounded-lg transition-all duration-150 cursor-pointer"
        aria-label="Close sidebar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default React.memo(SidebarHeader);

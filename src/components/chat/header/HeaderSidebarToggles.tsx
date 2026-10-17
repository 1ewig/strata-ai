'use client';

import React from 'react';
import { Menu, PanelLeftOpen } from 'lucide-react';
import { useChatUI } from '@/contexts/ChatUIContext';

/**
 * Sidebar toggle controls for the chat header: the mobile menu button and the
 * desktop expand button shown only while the sidebar is collapsed.
 */
export default function HeaderSidebarToggles() {
  const { openSidebar, isSidebarCollapsed, expandSidebar } = useChatUI();

  return (
    <>
      <button
        onClick={openSidebar}
        className="md:hidden p-2 -ml-1 text-text-muted hover:text-text-primary hover:bg-surface-hover/60 active:scale-90 rounded-lg transition-all duration-150 cursor-pointer shrink-0"
        aria-label="Open sidebar"
      >
        <Menu className="w-4 h-4" />
      </button>

      <button
        onClick={expandSidebar}
        className={`${isSidebarCollapsed ? 'md:flex' : ''} hidden p-2 -ml-1 text-text-muted hover:text-text-primary hover:bg-surface-hover/60 active:scale-90 rounded-lg transition-all duration-150 cursor-pointer shrink-0`}
        aria-label="Expand sidebar"
      >
        <PanelLeftOpen className="w-4 h-4" />
      </button>
    </>
  );
}

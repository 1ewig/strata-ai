'use client';

import React from 'react';
import { Menu, PanelLeftOpen } from 'lucide-react';
import { useChatUI } from '@/contexts/ChatUIContext';

export interface HeaderSidebarTogglesProps {
  onOpenSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onExpandSidebar?: () => void;
}

/**
 * Sidebar toggle controls for the chat header: the mobile menu button and the
 * desktop expand button shown only while the sidebar is collapsed.
 * Can receive callbacks and state as props from parent or fall back to ChatUIContext.
 */
export default function HeaderSidebarToggles({
  onOpenSidebar,
  isSidebarCollapsed: isCollapsedProp,
  onExpandSidebar,
}: HeaderSidebarTogglesProps) {
  const chatUI = useChatUI();

  const handleOpenSidebar = onOpenSidebar ?? chatUI.openSidebar;
  const isSidebarCollapsed = isCollapsedProp ?? chatUI.isSidebarCollapsed;
  const handleExpandSidebar = onExpandSidebar ?? chatUI.expandSidebar;

  return (
    <>
      <button
        onClick={handleOpenSidebar}
        className="md:hidden p-2 -ml-1 text-text-muted hover:text-text-primary hover:bg-surface-hover/60 active:scale-90 rounded-lg transition-all duration-150 cursor-pointer shrink-0"
        aria-label="Open sidebar"
      >
        <Menu className="w-4 h-4" />
      </button>

      <button
        onClick={handleExpandSidebar}
        className={`${isSidebarCollapsed ? 'md:flex' : ''} hidden p-2 -ml-1 text-text-muted hover:text-text-primary hover:bg-surface-hover/60 active:scale-90 rounded-lg transition-all duration-150 cursor-pointer shrink-0`}
        aria-label="Expand sidebar"
      >
        <PanelLeftOpen className="w-4 h-4" />
      </button>
    </>
  );
}

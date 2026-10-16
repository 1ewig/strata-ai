'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/** Shape of the chat shell UI state consumed by the sidebar and chat header. */
interface ChatUIContextType {
  /** Whether the mobile sidebar drawer is expanded. */
  isSidebarOpen: boolean;
  /** Expands the mobile sidebar drawer. */
  openSidebar: () => void;
  /** Collapses the mobile sidebar drawer. */
  closeSidebar: () => void;
  /** Whether the desktop sidebar is collapsed (hidden). */
  isSidebarCollapsed: boolean;
  /** Collapses the desktop sidebar. */
  collapseSidebar: () => void;
  /** Expands the collapsed desktop sidebar. */
  expandSidebar: () => void;
}

/** The context itself, undefined until a provider mounts so consumers can detect missing scope. */
const ChatUIContext = createContext<ChatUIContextType | undefined>(undefined);

/** sessionStorage key persisting the mobile drawer open state. */
const SIDEBAR_OPEN_KEY = 'strata_sidebar_open';
/** sessionStorage key persisting the desktop collapsed state. */
const SIDEBAR_COLLAPSED_KEY = 'strata_sidebar_collapsed';

/**
 * Provides chat shell UI state (mobile drawer + desktop collapse) so the
 * sidebar and header share one owner without prop drilling. State is persisted
 * to sessionStorage to survive reloads within the session.
 */
export function ChatUIProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(SIDEBAR_OPEN_KEY) === 'true';
    }
    return false;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    }
    return false;
  });

  /** Expands the mobile drawer and remembers it for the session. */
  const openSidebar = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SIDEBAR_OPEN_KEY, 'true');
    }
    setIsSidebarOpen(true);
  }, []);

  /** Collapses the mobile drawer and clears the persisted flag. */
  const closeSidebar = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SIDEBAR_OPEN_KEY);
    }
    setIsSidebarOpen(false);
  }, []);

  /** Hides the desktop sidebar and remembers it for the session. */
  const collapseSidebar = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
    }
    setIsSidebarCollapsed(true);
  }, []);

  /** Shows the collapsed desktop sidebar and clears the persisted flag. */
  const expandSidebar = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
    }
    setIsSidebarCollapsed(false);
  }, []);

  const value = useMemo<ChatUIContextType>(
    () => ({
      isSidebarOpen,
      openSidebar,
      closeSidebar,
      isSidebarCollapsed,
      collapseSidebar,
      expandSidebar,
    }),
    [isSidebarOpen, openSidebar, closeSidebar, isSidebarCollapsed, collapseSidebar, expandSidebar],
  );

  return <ChatUIContext.Provider value={value}>{children}</ChatUIContext.Provider>;
}

/**
 * Reads the chat shell UI context.
 * @returns The shell UI state and controls.
 * @throws If called outside a ChatUIProvider.
 */
export function useChatUI() {
  const context = useContext(ChatUIContext);
  if (!context) {
    throw new Error('useChatUI must be used within a ChatUIProvider');
  }
  return context;
}

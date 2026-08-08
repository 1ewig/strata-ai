'use client';

import React, { use, useRef, useState } from 'react';
import { StickToBottom } from 'use-stick-to-bottom';
import Sidebar from '@/components/Sidebar';
import WorkspaceDrawer from '@/components/workspace/WorkspaceDrawer';
import ChatPanel from '@/components/chat/ChatPanel';
import ChatInput from '@/components/chat/ChatInput';
import ChatHeader from '@/components/chat/ChatHeader';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { useChatSession } from '@/hooks/useChatSession';
import { useConversations } from '@/hooks/useConversations';
import { useSignOut } from '@/hooks/useSignOut';
import { useTheme } from '@/hooks/useTheme';

/**
 * Main chat workspace for a conversation: chat panel, input, header, sidebar,
 * and the file workspace drawer. Auto-scrolling is delegated to
 * <StickToBottom>, which also renders the scroll-to-bottom affordance.
 *
 * @param params - Route params containing the conversation id
 * @returns The chat workspace UI
 */
export default function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  // Conversations for the signed-in user; guards are below so the sidebar
  // only renders after the session has resolved.
  const {
    conversations,
    conversationCount,
    isMaxConversationsReached,
    handleNewChat,
    handleDeleteConversation,
    handleRenameConversation,
    handleTogglePinConversation,
  } = useConversations(session?.user?.id, chatId);
  const { isPending: isSigningOut, handleSignOut } = useSignOut();
  const { isDark, toggle: toggleTheme } = useTheme();
  // Anchor div passed to ChatPanel for the message list scroll position.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('strata_sidebar_open') === 'true';
    }
    return false;
  });

  // Redirect unauthenticated visitors to auth, preserving the return URL.
  React.useEffect(() => {
    if (!isSessionPending && !session?.user) {
      router.replace(`/auth?callbackUrl=/chat-id/${chatId}`);
    }
  }, [session, isSessionPending, chatId, router]);

  const {
    model,
    thinkingLevel,
    isWorkspaceDrawerOpen,
    setIsWorkspaceDrawerOpen,
    files,
    activeFileId,
    displayMessages,
    tokenUsage,
    isContextWindowExhausted,
    streamingContent,
    isLoading,
    rateLimitData,
    quotaError,
    clearQuotaError,
    checkQuotaStatus,
    handleSendMessage,
    handleStop,
    handleSelectFile,
    handleCreateFile,
    handleUpdateFile,
    handleDeleteFile,
    handleModelSelect,
    handleThinkingLevelChange,
  } = useChatSession(chatId);

  const handleOpenDrawer = React.useCallback(() => setIsWorkspaceDrawerOpen(true), [setIsWorkspaceDrawerOpen]);

  const handleCloseDrawer = React.useCallback(() => setIsWorkspaceDrawerOpen(false), [setIsWorkspaceDrawerOpen]);

  const handleOpenSidebar = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('strata_sidebar_open', 'true');
    }
    setIsSidebarOpen(true);
  }, []);

  const handleCloseSidebar = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('strata_sidebar_open');
    }
    setIsSidebarOpen(false);
  }, []);

  const handleOpenFile = React.useCallback(
    (fileId: string) => {
      handleSelectFile(fileId);
      setIsWorkspaceDrawerOpen(true);
    },
    [handleSelectFile, setIsWorkspaceDrawerOpen],
  );

  // Open the workspace drawer when other components dispatch this custom event.
  React.useEffect(() => {
    const handleCustomOpen = () => setIsWorkspaceDrawerOpen(true);
    window.addEventListener('open-workspace-drawer', handleCustomOpen);
    return () => {
      window.removeEventListener('open-workspace-drawer', handleCustomOpen);
    };
  }, [setIsWorkspaceDrawerOpen]);

  // Show a spinner while the session is still being verified.
  if (isSessionPending || !session?.user) {

    return (
      <main className="h-dvh bg-surface-base flex items-center justify-center text-text-muted text-label">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Verifying session...
        </div>
      </main>
    );
  }

  const chatInputNode = (
    <ChatInput
      onSendMessage={handleSendMessage}
      onStop={handleStop}
      isLoading={isLoading}
      model={model}
      thinkingLevel={thinkingLevel}
      onModelSelect={handleModelSelect}
      onThinkingLevelChange={handleThinkingLevelChange}
      rateLimitData={rateLimitData}
      isContextWindowExhausted={isContextWindowExhausted}
    />
  );

  const isNewChat = displayMessages.length === 0 && streamingContent === null && !isLoading && !quotaError;

  return (
    <main className="h-dvh max-h-dvh bg-surface-base text-text-primary flex overflow-hidden font-sans">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        conversations={conversations}
        conversationCount={conversationCount}
        isMaxConversationsReached={isMaxConversationsReached}
        activeConversationId={chatId}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        onRename={handleRenameConversation}
        onTogglePin={handleTogglePinConversation}
        session={session}
        isSigningOut={isSigningOut}
        onSignOut={handleSignOut}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        rateLimitData={rateLimitData}
      />

      <div className="flex-1 flex flex-col h-dvh overflow-hidden min-w-0 relative">
        {(() => {
          const activeConversation = conversations?.find(c => c.id === chatId);
          const headerTitle = displayMessages.length > 0
            ? activeConversation?.title || 'Chat Workspace'
            : 'Chat Workspace';

          return (
            <ChatHeader
              title={headerTitle}
              files={files}
              activeFileId={activeFileId}
              model={model}
              tokenUsage={tokenUsage}
              onOpenFile={handleOpenFile}
              onOpenDrawer={handleOpenDrawer}
              onOpenSidebar={handleOpenSidebar}
              onNewChat={handleNewChat}
            />
          );
        })()}

        <StickToBottom className="flex-1 min-h-0" resize="auto" initial="instant">
          {(context) => (
            <>
              <StickToBottom.Content className="max-w-4xl w-full mx-auto px-4 pb-36">
                <ChatPanel
                  messages={displayMessages}
                  streamingContent={streamingContent}
                  isLoading={isLoading}
                  messagesEndRef={messagesEndRef}
                  onOpenDrawer={handleOpenDrawer}
                  quotaError={quotaError}
                  onDismissQuotaError={clearQuotaError}
                  chatId={chatId}
                  isNewChat={isNewChat}
                  chatInputNode={chatInputNode}
                />
              </StickToBottom.Content>

              {/* Floating button appears when scrolled up - clicks snap back to the bottom */}
              {!context.isAtBottom && !isNewChat && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40">
                  <button
                    onClick={() => context.scrollToBottom()}
                    className="rounded-full border border-edge-raised bg-surface-overlay/90 px-3.5 py-1.5 text-caption font-medium text-text-muted hover:text-text-primary shadow-lg backdrop-blur-md transition-colors cursor-pointer"
                  >
                    ↓ Scroll to bottom
                  </button>
                </div>
              )}

            </>
          )}
        </StickToBottom>

        {!isNewChat && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-base via-surface-base/95 to-transparent pt-6 pb-4 px-4 pointer-events-none z-30 animate-slide-up">
            <div className="max-w-4xl mx-auto pointer-events-auto">
              {chatInputNode}
            </div>
          </div>
        )}
      </div>

      <WorkspaceDrawer
        isOpen={isWorkspaceDrawerOpen}
        onClose={handleCloseDrawer}
        files={files}
        activeFileId={activeFileId}
        onSelectFile={handleSelectFile}
        onUpdateFile={handleUpdateFile}
        onCreateFile={handleCreateFile}
        onDeleteFile={handleDeleteFile}
        isLoading={isLoading}
      />
    </main>
  );
}

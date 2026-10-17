'use client';

import React, { use } from 'react';
import Sidebar from '@/components/Sidebar';
import WorkspaceDrawer from '@/components/workspace/WorkspaceDrawer';
import ChatPanel from '@/components/chat/ChatPanel';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';
import { useChatSession } from '@/hooks/useChatSession';
import { useConversations } from '@/hooks/useConversations';
import { useSignOut } from '@/hooks/useSignOut';
import { useTheme } from '@/hooks/useTheme';
import { ChatUIProvider } from '@/contexts/ChatUIContext';
import { ComposerProvider } from '@/contexts/ComposerContext';

/**
 * Main chat workspace orchestrator: composes the three-column desktop layout
 * (Sidebar, ChatPanel, WorkspaceDrawer) and synchronizes user session & Dexie data.
 *
 * @param params - Route params containing the conversation id
 * @returns The chat workspace UI
 */
export default function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const userId = session?.user?.id;

  // Check ownership of the conversation in Dexie to enforce client-side RLS isolation
  const currentConv = useLiveQuery(() => db.conversations.get(chatId), [chatId]);
  const isUnauthorized = Boolean(
    !isSessionPending &&
    userId &&
    currentConv &&
    currentConv.userId &&
    currentConv.userId !== userId
  );

  const { isPending: isSigningOut, handleSignOut } = useSignOut();
  const { isDark, toggle: toggleTheme } = useTheme();

  // Redirect unauthenticated visitors to auth without leaking the private chat ID.
  React.useEffect(() => {
    if (!isSessionPending && !session?.user) {
      router.replace('/auth/signin');
    }
  }, [session, isSessionPending, router]);

  // Redirect unauthorized users (trying to access another user's conversation) to the home redirector.
  React.useEffect(() => {
    if (isUnauthorized) {
      router.replace('/');
    }
  }, [isUnauthorized, router]);

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
    isLoading,
    isCompacting,
    rateLimitData,
    handleSendMessage,
    handleTriggerCompaction,
    handleStop,
    handleSelectFile,
    handleCreateFile,
    handleUpdateFile,
    handleDeleteFile,
    handleModelSelect,
    handleThinkingLevelChange,
  } = useChatSession(chatId);

  const isNewChat = displayMessages.length === 0 && !isLoading;

  const {
    conversations,
    conversationCount,
    isMaxConversationsReached,
    handleNewChat,
    handleDeleteConversation,
    handleRenameConversation,
    handleTogglePinConversation,
  } = useConversations(userId, chatId, isNewChat);

  const handleOpenDrawer = React.useCallback(() => setIsWorkspaceDrawerOpen(true), [setIsWorkspaceDrawerOpen]);

  const handleCloseDrawer = React.useCallback(() => setIsWorkspaceDrawerOpen(false), [setIsWorkspaceDrawerOpen]);

  const handleOpenFile = React.useCallback(
    (fileId: string) => {
      handleSelectFile(fileId);
      setIsWorkspaceDrawerOpen(true);
    },
    [handleSelectFile, setIsWorkspaceDrawerOpen],
  );

  // Show a spinner while the session is still being verified or redirecting from an unauthorized chat.
  if (isSessionPending || !session?.user || isUnauthorized) {
    return (
      <main className="h-dvh bg-surface-base flex items-center justify-center text-text-muted text-label">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          {isUnauthorized ? 'Redirecting...' : 'Verifying session...'}
        </div>
      </main>
    );
  }

  const activeConversation = conversations?.find((c) => c.id === chatId);
  const headerTitle =
    displayMessages.length > 0 ? activeConversation?.title || 'Chat Workspace' : 'Chat Workspace';

  return (
    <ChatUIProvider>
      <ComposerProvider>
        <main className="h-dvh max-h-dvh bg-surface-base text-text-primary flex overflow-hidden font-sans">
          <Sidebar
            conversations={conversations}
            conversationCount={conversationCount}
            isMaxConversationsReached={isMaxConversationsReached}
            activeConversationId={chatId}
            onNewChat={handleNewChat}
            isCurrentChatEmpty={isNewChat}
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

          <ChatPanel
            chatId={chatId}
            title={headerTitle}
            isNewChat={isNewChat}
            files={files}
            activeFileId={activeFileId}
            onOpenFile={handleOpenFile}
            onOpenDrawer={handleOpenDrawer}
            onNewChat={handleNewChat}
            model={model}
            thinkingLevel={thinkingLevel}
            tokenUsage={tokenUsage}
            onModelSelect={handleModelSelect}
            onThinkingLevelChange={handleThinkingLevelChange}
            messages={displayMessages}
            isLoading={isLoading}
            isCompacting={isCompacting}
            isContextWindowExhausted={isContextWindowExhausted}
            rateLimitData={rateLimitData}
            onSendMessage={handleSendMessage}
            onTriggerCompaction={handleTriggerCompaction}
            onStop={handleStop}
          />

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
      </ComposerProvider>
    </ChatUIProvider>
  );
}
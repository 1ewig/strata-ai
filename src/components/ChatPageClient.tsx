'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StickToBottom } from 'use-stick-to-bottom';
import { ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '@/lib/auth/client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/database';
import { useChatSession } from '@/hooks/chat/useChatSession';
import { useConversations } from '@/hooks/conversations/useConversations';
import { useSignOut } from '@/hooks/auth/useAuth';
import { useTheme } from '@/hooks/common/useTheme';
import { useChatUI } from '@/contexts/ChatUIContext';
import { ChatInputProvider } from '@/contexts/ChatInputContext';
import Sidebar from '@/components/sidebar/Sidebar';
import WorkspaceDrawer from '@/components/workspace/WorkspaceDrawer';
import ChatHeader from '@/components/chat/header/ChatHeader';
import ChatInput from '@/components/chat/input/ChatInput';
import ChatHero from '@/components/chat/ChatHero';
import MessageList from '@/components/chat/message/MessageList';
import { pillFloatVariants } from '@/constants/animations';
import { prewarmHighlighter } from '@/lib/code/shiki-highlighter';

/**
 * Extra clearance at the bottom of the chat viewport so downward-opening
 * menus (e.g. MessageActionsMenu) do not collide with the floating ChatInput.
 */
const CHAT_VIEWPORT_BOTTOM_BUFFER_PX = 100;

export interface ChatPageClientProps {
  chatId: string;
}

/**
 * ChatPageClient is the root client orchestrator for an active conversation workspace:
 * it verifies the authenticated session and Dexie client-side RLS, composes all state hooks,
 * and renders the 3-pillar layout (Sidebar, center StickToBottom chat viewport, and WorkspaceDrawer).
 */
export default function ChatPageClient({ chatId }: ChatPageClientProps) {
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

  // Prewarm syntax highlighter during browser idle time
  React.useEffect(() => {
    prewarmHighlighter();
  }, []);

  const { openWorkspaceDrawer } = useChatUI();

  const {
    model,
    thinkingLevel,
    files,
    activeFileId,
    displayMessages,
    tokenUsage,
    isContextWindowExhausted,
    isLoading,
    isCompacting,
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
    handleNewChat,
    handleDeleteConversation,
    handleRenameConversation,
    handleTogglePinConversation,
  } = useConversations(userId, chatId, isNewChat);

  const handleOpenFile = React.useCallback(
    (fileId: string) => {
      handleSelectFile(fileId);
      openWorkspaceDrawer();
    },
    [handleSelectFile, openWorkspaceDrawer],
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [inputHeight, setInputHeight] = useState(176);

  // Dynamically sync bottom padding of the chat content with floating chat input height changes
  React.useEffect(() => {
    const el = inputContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight;
        if (height > 0) {
          setInputHeight(Math.ceil(height));
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  const chatInputNode = (
    <ChatInput
      chatId={chatId}
      onSendMessage={handleSendMessage}
      onTriggerCompaction={handleTriggerCompaction}
      onStop={handleStop}
      isLoading={isLoading}
      isCompacting={isCompacting}
      model={model}
      thinkingLevel={thinkingLevel}
      onModelSelect={handleModelSelect}
      onThinkingLevelChange={handleThinkingLevelChange}
      isContextWindowExhausted={isContextWindowExhausted}
    />
  );

  return (
    <ChatInputProvider>
      <main className="h-dvh max-h-dvh bg-surface-base text-text-primary flex overflow-hidden font-sans">
        <Sidebar
          conversations={conversations}
          conversationCount={conversationCount}
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
        />

        <div className="flex-1 flex flex-col h-dvh overflow-hidden min-w-0 relative">
          <ChatHeader
            title={headerTitle}
            files={files}
            activeFileId={activeFileId}
            model={model}
            thinkingLevel={thinkingLevel}
            tokenUsage={tokenUsage}
            onOpenFile={handleOpenFile}
            onNewChat={handleNewChat}
            isNewChat={isNewChat}
          />

            <StickToBottom
              className="flex-1 min-h-0 overscroll-y-contain [overflow-anchor:auto] [will-change:scroll-position] [transform:translateZ(0)] chat-scroll-container"
              resize="auto"
              initial="instant"
            >
              {(context) => (
                <>
                  <StickToBottom.Content
                    className={`max-w-4xl w-full mx-auto px-4 ${
                      isNewChat ? 'min-h-full flex flex-col justify-center py-6' : ''
                    }`}
                    style={
                      !isNewChat
                        ? { paddingBottom: `${inputHeight + CHAT_VIEWPORT_BOTTOM_BUFFER_PX}px` }
                        : undefined
                    }
                  >
                    {isNewChat ? (
                      <ChatHero chatId={chatId} chatInputNode={chatInputNode} />
                    ) : (
                      <MessageList
                        messages={displayMessages}
                        isLoading={isLoading}
                        messagesEndRef={messagesEndRef}
                      />
                    )}
                  </StickToBottom.Content>

                  {!isNewChat && (
                    <div
                      ref={inputContainerRef}
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-base via-surface-base/95 to-transparent pt-12 pb-4 px-4 pointer-events-none z-30 animate-slide-up"
                    >
                      <div className="relative max-w-4xl mx-auto pointer-events-auto">
                        {/* Floating button appears when scrolled up - anchored cleanly above ChatInput */}
                        <AnimatePresence>
                          {!context.isAtBottom && (
                            <motion.div
                              key="scroll-to-bottom"
                              variants={pillFloatVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              className="absolute bottom-full mb-3.5 left-1/2 -translate-x-1/2 z-10 pointer-events-auto"
                            >
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => context.scrollToBottom()}
                                className="flex items-center gap-1.5 rounded-full border border-edge-raised bg-surface-raised/95 dark:bg-surface-raised/90 px-3.5 py-1.5 text-caption font-semibold text-text-primary hover:text-text-bright shadow-card-lg backdrop-blur-md transition-colors cursor-pointer select-none"
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-primary" />
                                <span>Scroll to bottom</span>
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {chatInputNode}
                      </div>
                    </div>
                  )}
                </>
              )}
            </StickToBottom>
          </div>

          <WorkspaceDrawer
            files={files}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onUpdateFile={handleUpdateFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            isLoading={isLoading}
          />
        </main>
    </ChatInputProvider>
  );
}

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

export default function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    streamingContent,
    isLoading,
    rateLimitData,
    handleSendMessage,
    handleSelectFile,
    handleCreateFile,
    handleUpdateFile,
    handleDeleteFile,
    handleModelSelect,
    handleThinkingLevelChange,
  } = useChatSession(chatId);

  const handleOpenDrawer = React.useCallback(() => setIsWorkspaceDrawerOpen(true), [setIsWorkspaceDrawerOpen]);

  const handleOpenSidebar = React.useCallback(() => setIsSidebarOpen(true), []);

  const handleCloseSidebar = React.useCallback(() => setIsSidebarOpen(false), []);

  const handleOpenFile = React.useCallback(
    (fileId: string) => {
      handleSelectFile(fileId);
      setIsWorkspaceDrawerOpen(true);
    },
    [handleSelectFile, setIsWorkspaceDrawerOpen],
  );

  React.useEffect(() => {
    const handleCustomOpen = () => setIsWorkspaceDrawerOpen(true);
    window.addEventListener('open-resume-drawer', handleCustomOpen);
    window.addEventListener('open-workspace-drawer', handleCustomOpen);
    return () => {
      window.removeEventListener('open-resume-drawer', handleCustomOpen);
      window.removeEventListener('open-workspace-drawer', handleCustomOpen);
    };
  }, [setIsWorkspaceDrawerOpen]);

  if (isSessionPending || !session?.user) {

    return (
      <main className="h-screen bg-surface-base flex items-center justify-center text-text-muted text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Verifying session...
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen max-h-screen bg-surface-base text-text-primary flex overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 relative">
        <ChatHeader
          files={files}
          activeFileId={activeFileId}
          onOpenFile={handleOpenFile}
          onOpenDrawer={handleOpenDrawer}
          onOpenSidebar={handleOpenSidebar}
        />

        <StickToBottom className="flex-1 min-h-0" resize="smooth" initial="instant">
          {(context) => (
            <>
              <StickToBottom.Content className="max-w-2xl w-full mx-auto px-4 pb-48">
                <ChatPanel
                  messages={displayMessages}
                  streamingContent={streamingContent}
                  isLoading={isLoading}
                  messagesEndRef={messagesEndRef}
                  onOpenDrawer={handleOpenDrawer}
                />
              </StickToBottom.Content>

              {!context.isAtBottom && (
                <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-40">
                  <button
                    onClick={() => context.scrollToBottom()}
                    className="rounded-full border border-edge-raised bg-surface-overlay/90 px-3.5 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary shadow-lg backdrop-blur-md transition-colors cursor-pointer"
                  >
                    ↓ Scroll to bottom
                  </button>
                </div>
              )}

            </>
          )}
        </StickToBottom>


        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-base via-surface-base/95 to-transparent pt-6 pb-4 px-4 pointer-events-none z-30">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              model={model}
              thinkingLevel={thinkingLevel}
              onModelSelect={handleModelSelect}
              onThinkingLevelChange={handleThinkingLevelChange}
              rateLimitData={rateLimitData}
            />
          </div>
        </div>
      </div>

      <WorkspaceDrawer
        isOpen={isWorkspaceDrawerOpen}
        onClose={() => setIsWorkspaceDrawerOpen(false)}
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

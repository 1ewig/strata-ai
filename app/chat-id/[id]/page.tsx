'use client';

import React, { use, useRef } from 'react';
import { StickToBottom } from 'use-stick-to-bottom';
import Sidebar from '@/components/Sidebar';
import WorkspaceDrawer from '@/components/workspace/WorkspaceDrawer';
import ChatPanel from '@/components/chat/ChatPanel';
import ChatInput from '@/components/chat/ChatInput';
import ChatHeader from '@/components/chat/ChatHeader';
import { useChatSession } from '@/hooks/useChatSession';

export default function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    model,
    thinkingLevel,
    inputValue,
    setInputValue,
    isWorkspaceDrawerOpen,
    setIsWorkspaceDrawerOpen,
    files,
    activeFileId,
    displayMessages,
    streamingContent,
    status,
    isLoading,
    handleSendMessage,
    handleSubmit,
    handleSelectFile,
    handleCreateFile,
    handleUpdateFile,
    handleDeleteFile,
    handleModelSelect,
    handleThinkingLevelChange,
  } = useChatSession(chatId);

  const handleOpenDrawer = () => setIsWorkspaceDrawerOpen(true);

  React.useEffect(() => {
    const handleCustomOpen = () => setIsWorkspaceDrawerOpen(true);
    window.addEventListener('open-resume-drawer', handleCustomOpen);
    window.addEventListener('open-workspace-drawer', handleCustomOpen);
    return () => {
      window.removeEventListener('open-resume-drawer', handleCustomOpen);
      window.removeEventListener('open-workspace-drawer', handleCustomOpen);
    };
  }, [setIsWorkspaceDrawerOpen]);

  return (
    <main className="h-screen max-h-screen bg-surface-base text-text-primary flex overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 relative">
        <ChatHeader
          files={files}
          activeFileId={activeFileId}
          model={model}
          thinkingLevel={thinkingLevel}
          onModelSelect={handleModelSelect}
          onThinkingLevelChange={handleThinkingLevelChange}
          onOpenFile={(fileId) => {
            handleSelectFile(fileId);
            setIsWorkspaceDrawerOpen(true);
          }}
          onOpenDrawer={handleOpenDrawer}
        />

        <StickToBottom className="flex-1 min-h-0" resize="smooth" initial="instant">
          {(context) => (
            <>
              <StickToBottom.Content className="max-w-2xl w-full mx-auto px-4 pb-28">
                <ChatPanel
                  messages={displayMessages}
                  streamingContent={streamingContent}
                  isLoading={isLoading}
                  messagesEndRef={messagesEndRef}
                  onSendMessage={handleSendMessage}
                  onOpenDrawer={handleOpenDrawer}
                />
              </StickToBottom.Content>

              {!context.isAtBottom && (
                <div className="flex justify-center pb-4">
                  <button
                    onClick={() => context.scrollToBottom()}
                    className="rounded-full border border-edge-raised bg-surface-overlay/90 px-3 py-1 text-xs text-text-muted hover:text-text-primary shadow-sm backdrop-blur-sm transition-colors"
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
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSubmit={handleSubmit}
              isLoading={isLoading}
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
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </main>
  );
}

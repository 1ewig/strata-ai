'use client';

import React, { use, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import ResumeDrawer from '@/components/resumes/ResumeDrawer';
import ChatPanel from '@/components/ChatPanel';
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
    isResumeDrawerOpen,
    setIsResumeDrawerOpen,
    resume,
    displayMessages,
    streamingContent,
    isLoading,
    handleSendMessage,
    handleSubmit,
    handleUpdateResume,
    handleModelSelect,
    handleThinkingLevelChange,
  } = useChatSession(chatId);

  const handleOpenResumeDrawer = () => setIsResumeDrawerOpen(true);

  React.useEffect(() => {
    const handleCustomOpen = () => setIsResumeDrawerOpen(true);
    window.addEventListener('open-resume-drawer', handleCustomOpen);
    return () => window.removeEventListener('open-resume-drawer', handleCustomOpen);
  }, [setIsResumeDrawerOpen]);

  return (
    <main className="h-screen max-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 relative">
        <ChatHeader
          resumeTitle={resume?.title}
          model={model}
          thinkingLevel={thinkingLevel}
          onModelSelect={handleModelSelect}
          onThinkingLevelChange={handleThinkingLevelChange}
          onOpenResumeDrawer={handleOpenResumeDrawer}
        />

        <div className="flex-1 overflow-y-auto min-h-0 pb-28">
          <div className="max-w-2xl w-full mx-auto px-4">
            <ChatPanel
              messages={displayMessages}
              streamingContent={streamingContent}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
              onSendMessage={handleSendMessage}
              onOpenResumeDrawer={handleOpenResumeDrawer}
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pt-6 pb-4 px-4 pointer-events-none z-30">
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

      <ResumeDrawer
        isOpen={isResumeDrawerOpen}
        onClose={() => setIsResumeDrawerOpen(false)}
        resume={resume}
        onUpdateResume={handleUpdateResume}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </main>
  );
}

'use client';

import React, { useRef, useState } from 'react';
import { StickToBottom } from 'use-stick-to-bottom';
import { ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatInput from '@/components/chat/ChatInput';
import ChatHero from '@/components/chat/ChatHero';
import MessageList from '@/components/chat/MessageList';
import { pillFloatVariants } from '@/components/chat/animations';
import type { WorkspaceFile } from '@/lib/schemas';
import type { ChatMessage, ConversationTokenMetrics } from '@/lib/token-usage';
import type { ProcessedImage } from '@/lib/image-utils';
import type { ProcessedDocument } from '@/lib/document-utils';

/** Props for the ChatPanel workspace view orchestrator. */
export interface ChatPanelProps {
  chatId: string;
  title?: string;
  isNewChat?: boolean;
  // Files & Workspace drawer controls
  files?: WorkspaceFile[];
  activeFileId?: string | null;
  onOpenFile?: (fileId: string) => void;
  onOpenDrawer?: () => void;
  onNewChat: () => void;
  // Model settings & Token metrics
  model: string;
  thinkingLevel?: string;
  tokenUsage?: ConversationTokenMetrics | null;
  onModelSelect?: (modelId: string) => void;
  onThinkingLevelChange?: (level: string) => void;
  // Messages & Active Streaming
  messages: ChatMessage[];
  isLoading: boolean;
  isCompacting?: boolean;
  isContextWindowExhausted?: boolean;
  rateLimitData?: {
    remaining5h: number;
    remainingWeek: number;
    retryAfter?: number;
  } | null;
  onSendMessage: (text: string, images?: ProcessedImage[], documents?: ProcessedDocument[]) => void;
  onTriggerCompaction?: () => void;
  onStop?: () => void;
}

/**
 * ChatPanel is the unified host component for the center chat viewport:
 * it renders the ChatHeader, manages the StickToBottom scroll container,
 * switches between ChatHero (empty state) and MessageList (active chat),
 * and hosts the docked ChatInput composer with scroll-to-bottom affordance.
 */
export default React.memo(function ChatPanel({
  chatId,
  title,
  isNewChat = false,
  files,
  activeFileId,
  onOpenFile,
  onOpenDrawer,
  onNewChat,
  model,
  thinkingLevel,
  tokenUsage,
  onModelSelect,
  onThinkingLevelChange,
  messages,
  isLoading,
  isCompacting,
  isContextWindowExhausted,
  rateLimitData,
  onSendMessage,
  onTriggerCompaction,
  onStop,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(176);

  // Dynamically sync bottom padding of the chat content with floating composer height changes
  React.useEffect(() => {
    const el = composerContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight;
        if (height > 0) {
          setComposerHeight(Math.ceil(height));
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chatInputNode = (
    <ChatInput
      chatId={chatId}
      onSendMessage={onSendMessage}
      onTriggerCompaction={onTriggerCompaction}
      onStop={onStop}
      isLoading={isLoading}
      isCompacting={isCompacting}
      model={model}
      thinkingLevel={thinkingLevel}
      onModelSelect={onModelSelect}
      onThinkingLevelChange={onThinkingLevelChange}
      rateLimitData={rateLimitData}
      isContextWindowExhausted={isContextWindowExhausted}
    />
  );

  return (
    <div className="flex-1 flex flex-col h-dvh overflow-hidden min-w-0 relative">
      <ChatHeader
        title={title}
        files={files}
        activeFileId={activeFileId}
        model={model}
        thinkingLevel={thinkingLevel}
        tokenUsage={tokenUsage}
        onOpenFile={onOpenFile}
        onOpenDrawer={onOpenDrawer}
        onNewChat={onNewChat}
        isNewChat={isNewChat}
      />

      <StickToBottom
        className="flex-1 min-h-0 overscroll-y-contain [overflow-anchor:auto] [will-change:scroll-position] [transform:translateZ(0)]"
        resize="auto"
        initial="instant"
      >
        {(context) => (
          <>
            <StickToBottom.Content
              className={`max-w-4xl w-full mx-auto px-4 ${
                isNewChat ? 'min-h-full flex flex-col justify-center py-6' : ''
              }`}
              style={!isNewChat ? { paddingBottom: `${composerHeight}px` } : undefined}
            >
              {isNewChat ? (
                <ChatHero
                  chatId={chatId}
                  chatInputNode={chatInputNode}
                />
              ) : (
                <MessageList
                  messages={messages}
                  isLoading={isLoading}
                  messagesEndRef={messagesEndRef}
                />
              )}
            </StickToBottom.Content>

            {!isNewChat && (
              <div
                ref={composerContainerRef}
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
  );
});

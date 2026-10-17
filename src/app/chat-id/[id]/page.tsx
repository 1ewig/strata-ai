'use client';

import { use } from 'react';
import ChatPageClient from '@/components/ChatPageClient';
import { ChatUIProvider } from '@/contexts/ChatUIContext';

/**
 * Dynamic chat workspace route: unwraps route params via use(params),
 * mounts ChatUIProvider for shell state, and delegates state & layout orchestration to ChatPageClient.
 */
export default function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);
  return (
    <ChatUIProvider>
      <ChatPageClient chatId={chatId} />
    </ChatUIProvider>
  );
}
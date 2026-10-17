'use client';

import { use } from 'react';
import ChatPageClient from '@/components/ChatPageClient';

/**
 * Dynamic chat workspace route: unwraps route params via use(params)
 * and delegates state & layout orchestration to ChatPageClient.
 */
export default function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);
  return <ChatPageClient chatId={chatId} />;
}
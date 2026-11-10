import type { Metadata } from 'next';
import ChatPageClient from '@/components/ChatPageClient';
import { ChatUIProvider } from '@/contexts/ChatUIContext';

/**
 * Auth-gated workspace URLs must never surface in search results: noindex
 * overrides the permissive robots default inherited from the root layout,
 * while robots.ts disallows crawling the path entirely.
 */
export const metadata: Metadata = {
  title: 'Chat',
  robots: { index: false, follow: false },
};

/**
 * Dynamic chat workspace route: resolves route params on the server,
 * mounts ChatUIProvider for shell state, and delegates state & layout
 * orchestration to ChatPageClient.
 */
export default async function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = await params;
  return (
    <ChatUIProvider>
      <ChatPageClient chatId={chatId} />
    </ChatUIProvider>
  );
}

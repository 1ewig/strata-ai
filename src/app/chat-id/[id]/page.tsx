import ChatPageClient from '@/components/ChatPageClient';
import { ChatUIProvider } from '@/contexts/ChatUIContext';

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

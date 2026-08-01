import { db } from '@/lib/db/db';
import { generateId } from '@/lib/id';

export function getFriendlyErrorMessage(err: Error): string {
  const errMsg = err?.message || '';
  const lowerMsg = errMsg.toLowerCase();

  if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('networkerror') || lowerMsg.includes('network')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  if (lowerMsg.includes('401') || lowerMsg.includes('unauthorized')) {
    return 'Your session has expired. Please refresh the page and sign in again.';
  }
  if (lowerMsg.includes('400') || lowerMsg.includes('exceeds maximum') || lowerMsg.includes('character limit')) {
    return 'Your message or workspace content exceeds allowed limits. Please shorten it and try again.';
  }

  return 'I ran into a problem while processing your request. Please try again in a moment.';
}

export async function handleChatError({
  err,
  chatId,
  userId,
  chatRef,
  setQuotaError,
}: {
  err: Error;
  chatId: string;
  userId?: string;
  chatRef: React.RefObject<any>;
  setQuotaError: (val: any) => void;
}) {
  if (chatRef.current?.stop) {
    chatRef.current.stop();
  }

  const errMsg = err?.message || '';
  const isQuota = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit');

  if (isQuota) {
    setQuotaError((prev: any) => prev || {
      message: 'Usage quota reached (10 msgs / 5h, 50 msgs / week). Please wait before trying again.',
    });
    return;
  }

  const friendlyMessage = getFriendlyErrorMessage(err);
  const currentMessages = chatRef.current?.messages || [];

  if (currentMessages.length > 0) {
    const lastMsg = currentMessages[currentMessages.length - 1];
    let updatedMessages: any[];

    if (lastMsg.role === 'assistant') {
      const updatedAssistantMsg = {
        ...lastMsg,
        parts: [{ type: 'text', text: friendlyMessage }],
        content: friendlyMessage,
      };
      updatedMessages = [...currentMessages.slice(0, -1), updatedAssistantMsg];
    } else {
      const newAssistantMsg = {
        id: generateId(),
        role: 'assistant',
        parts: [{ type: 'text', text: friendlyMessage }],
        content: friendlyMessage,
      };
      updatedMessages = [...currentMessages, newAssistantMsg];
    }

    if (chatRef.current?.setMessages) {
      chatRef.current.setMessages(updatedMessages);
    }

    for (const msg of updatedMessages) {
      await db.messages.put({
        ...msg,
        chatId,
        ...(userId ? { userId } : {}),
        timestamp: new Date().toISOString(),
      });
    }
  }
}

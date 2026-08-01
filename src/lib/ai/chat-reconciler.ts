import {
  db,
  getWorkspaceFiles,
  updateConversationFiles,
} from '@/lib/db/db';
import {
  GenericUIMessage,
  extractDeletedFilesFromMessage,
  extractFilesFromMessage,
} from '@/lib/ai/message-extractor';

export interface ReconcileStepParams {
  chatId: string;
  message: unknown;
  allMessages: unknown[];
  finishReason?: string;
  continuationCountRef: React.RefObject<number>;
  sendMessageRef: React.RefObject<((msg: { text: string }) => void) | null>;
}

export async function reconcileFinishedStep({
  chatId,
  message,
  allMessages,
  finishReason,
  continuationCountRef,
  sendMessageRef,
}: ReconcileStepParams) {
  // Persist all messages to Dexie
  for (const msg of allMessages as any[]) {
    await db.messages.put({
      ...msg,
      chatId,
      timestamp: new Date().toISOString(),
    });
  }
  await db.conversations.update(chatId, { updatedAt: new Date().toISOString() });

  // Process workspace file updates/deletions ONLY from the current assistant message
  const currentMsg = message as GenericUIMessage;
  const deletions = extractDeletedFilesFromMessage(currentMsg);
  const updatedFiles = extractFilesFromMessage(currentMsg);

  if (deletions.length > 0 || (updatedFiles && updatedFiles.length > 0)) {
    const conv = await db.conversations.get(chatId);
    let currentFiles = getWorkspaceFiles(conv);

    // Apply deletions
    if (deletions.length > 0) {
      currentFiles = currentFiles.filter((f) => {
        for (const del of deletions) {
          if (del.fileId && f.id === del.fileId) return false;
          if (del.name && f.name.toLowerCase() === del.name.toLowerCase()) return false;
        }
        return true;
      });
    }

    // Apply creations or edits
    if (updatedFiles && updatedFiles.length > 0) {
      for (const newFile of updatedFiles) {
        const idx = currentFiles.findIndex(
          (f) => f.id === newFile.id || f.name.toLowerCase() === newFile.name.toLowerCase(),
        );
        if (idx >= 0) {
          currentFiles[idx] = newFile;
        } else {
          currentFiles.push(newFile);
        }
      }
    }

    const activeId = currentFiles.length > 0 ? currentFiles[0].id : undefined;
    await updateConversationFiles(chatId, currentFiles, activeId);
  }

  // Auto-continuation loop if step limit reached
  const currentCount = continuationCountRef.current ?? 0;
  if (finishReason === 'step-limit' && currentCount < 2) {
    continuationCountRef.current = currentCount + 1;
    console.log(
      `[useChatSession] Step limit reached. Auto-continuing pass ${continuationCountRef.current}/2...`,
    );
    setTimeout(() => {
      sendMessageRef.current?.({
        text: 'Please continue completing the task where you left off.',
      });
    }, 300);
  } else {
    continuationCountRef.current = 0;
  }
}

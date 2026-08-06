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
import {
  removeFileFromWorkspace,
  upsertFileIntoWorkspace,
} from '@/lib/ai/workspace';

/**
 * Parameters needed to reconcile one finished agent step into Dexie.
 * @property chatId - The conversation id the step belongs to.
 * @property userId - Optional user id stamped on persisted messages.
 * @property message - The final assistant message of the step, source of file deltas.
 * @property allMessages - Every message of the conversation to persist.
 * @property finishReason - The stream's finish reason (e.g. 'step-limit' triggers continuation).
 * @property continuationCountRef - Tracks how many auto-continuations already ran.
 * @property sendMessageRef - Ref to the send-message function used to continue the agent.
 */
export interface ReconcileStepParams {
  chatId: string;
  userId?: string;
  message: unknown;
  allMessages: unknown[];
  finishReason?: string;
  continuationCountRef: React.RefObject<number>;
  sendMessageRef: React.RefObject<((msg: { text: string }) => void) | null>;
}

/**
 * Persists a finished agent step: writes all messages, merges workspace file
 * deltas into the conversation, and auto-continues if the step limit was hit.
 * @param params - The reconciliation parameters for this step.
 */
export async function reconcileFinishedStep({
  chatId,
  userId,
  message,
  allMessages,
  finishReason,
  continuationCountRef,
  sendMessageRef,
}: ReconcileStepParams) {
  // Prepare batched messages payload
  const timestamp = new Date().toISOString();
  const dbMessages = (allMessages as any[]).map((msg) => ({
    ...msg,
    chatId,
    ...(userId ? { userId } : {}),
    timestamp,
  }));

  // Perform message batch writes and workspace file reconciliation atomically in a single transaction
  await db.transaction('rw', [db.messages, db.conversations], async () => {
    if (dbMessages.length > 0) {
      await db.messages.bulkPut(dbMessages);
    }
    await db.conversations.update(chatId, { updatedAt: timestamp });

    // Process workspace file updates/deletions ONLY from the current assistant message
    const currentMsg = message as GenericUIMessage;
    const deletions = extractDeletedFilesFromMessage(currentMsg);
    const updatedFiles = extractFilesFromMessage(currentMsg);

    if (deletions.length > 0 || (updatedFiles && updatedFiles.length > 0)) {
      const conv = await db.conversations.get(chatId);
      let currentFiles = getWorkspaceFiles(conv);

      // Apply deletions
      if (deletions.length > 0) {
        for (const del of deletions) {
          const identifier = del.fileId || del.name;
          if (identifier) {
            currentFiles = removeFileFromWorkspace(currentFiles, identifier);
          }
        }
      }

      // Apply creations or edits: replace by id/name, or append as a brand-new file.
      if (updatedFiles && updatedFiles.length > 0) {
        for (const newFile of updatedFiles) {
          currentFiles = upsertFileIntoWorkspace(currentFiles, newFile);
        }
      }

      // Keep the first file as the drawer's active selection, if any remain.
      const activeId = currentFiles.length > 0 ? currentFiles[0].id : undefined;
      await updateConversationFiles(chatId, currentFiles, activeId);
    }
  });

  // Auto-continuation loop if step limit reached
  const currentCount = continuationCountRef.current ?? 0;
  if (finishReason === 'step-limit' && currentCount < 2) {
    // Hand control back to the agent for up to 2 follow-up passes.
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
    // Normal finish (or max continuations): reset the counter for the next user turn.
    continuationCountRef.current = 0;
  }
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db/db';
import { generateId } from '@/lib/id';

/**
 * Redirects the landing page to the user's most recently updated
 * conversation, or to a fresh chat when none exists yet. Legacy chats
 * without a `userId` are treated as belonging to the signed-in user.
 *
 * @param userId - The signed-in user's id; undefined while the session loads
 *   (in which case no redirect happens).
 */
export function useLatestConversationRedirect(userId: string | undefined) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    async function initOrRedirect() {
      const all = await db.conversations.toArray();
      // Pick the most recently updated conversation belonging to this user.
      const userConvs = all
        .filter((c) => !c.userId || c.userId === userId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      // Open the latest conversation, otherwise start a fresh chat with a new id.
      if (userConvs.length > 0) {
        router.replace(`/chat-id/${userConvs[0].id}`);
      } else {
        const newId = generateId();
        router.replace(`/chat-id/${newId}`);
      }
    }
    initOrRedirect();
  }, [userId, router]);
}

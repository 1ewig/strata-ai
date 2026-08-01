'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { db } from '@/lib/db/db';
import { generateId } from '@/lib/id';

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;

    if (!session?.user) {
      router.replace('/auth');
      return;
    }

    async function initOrRedirect() {
      const userId = session?.user?.id;
      const all = await db.conversations.toArray();
      const userConvs = all
        .filter((c) => !c.userId || c.userId === userId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      if (userConvs.length > 0) {
        router.replace(`/chat-id/${userConvs[0].id}`);
      } else {
        const newId = generateId();
        router.replace(`/chat-id/${newId}`);
      }
    }
    initOrRedirect();
  }, [session, isPending, router]);

  return (
    <main className="min-h-dvh bg-surface-base flex items-center justify-center text-text-muted text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading workspace...
      </div>
    </main>
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { db } from '@/lib/db/db';
import { generateId } from '@/lib/id';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { InteractiveStudioPreview } from '@/components/landing/InteractiveStudioPreview';
import { LandingPillars } from '@/components/landing/LandingPillars';
import { LandingFlow } from '@/components/landing/LandingFlow';
import { LandingDetails } from '@/components/landing/LandingDetails';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

/**
 * Minimal, human-centric landing page for Strata AI.
 * Welcomes both visitors and existing users to a calm, thoughtful
 * document studio environment.
 */
export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;

  /**
   * Seamlessly routes authenticated users into their most recent active
   * conversation or starts a fresh chat session if no previous chats exist.
   */
  const handleOpenStudio = async () => {
    try {
      if (userId) {
        const all = await db.conversations.toArray();
        const userConvs = all
          .filter((c) => !c.userId || c.userId === userId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        if (userConvs.length > 0) {
          router.push(`/chat-id/${userConvs[0].id}`);
          return;
        }
      }
      const newId = generateId();
      router.push(`/chat-id/${newId}`);
    } catch (err) {
      console.error('[Landing] Failed to navigate to studio:', err);
      const fallbackId = generateId();
      router.push(`/chat-id/${fallbackId}`);
    }
  };

  return (
    <div className="min-h-dvh bg-surface-base text-text-primary flex flex-col selection:bg-primary-soft selection:text-text-bright transition-colors duration-200">
      <LandingHeader userId={userId} isPending={isPending} />

      <main className="flex-1">
        <LandingHero userId={userId} onOpenStudio={handleOpenStudio} />
        <InteractiveStudioPreview />
        <LandingFlow />
        <LandingPillars />
        <LandingDetails />
        <LandingCTA userId={userId} onOpenStudio={handleOpenStudio} />
      </main>

      <LandingFooter />
    </div>
  );
}

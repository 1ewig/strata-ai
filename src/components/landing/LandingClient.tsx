'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db/db';
import { generateId } from '@/lib/id';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingArtifacts } from '@/components/landing/LandingArtifacts';
import { LandingPhilosophy } from '@/components/landing/LandingPhilosophy';
import { LandingSpecimens } from '@/components/landing/LandingSpecimens';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

/** Props for the LandingClient component. */
interface LandingClientProps {
  /** The signed-in user's id resolved server-side. */
  userId?: string;
}

/**
 * Client component orchestrating the editorial atelier Strata AI landing page.
 */
export function LandingClient({ userId }: LandingClientProps) {
  const router = useRouter();

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
      console.error('[LandingClient] Failed to navigate to studio:', err);
      const fallbackId = generateId();
      router.push(`/chat-id/${fallbackId}`);
    }
  };

  return (
    <div className="min-h-dvh bg-surface-base text-text-primary flex flex-col selection:bg-primary-soft selection:text-text-bright transition-colors duration-200">
      <LandingHeader userId={userId} />

      <main className="flex-1">
        <LandingHero userId={userId} onOpenStudio={handleOpenStudio} />
        <LandingArtifacts />
        <LandingPhilosophy />
        <LandingSpecimens />
        <LandingCTA userId={userId} onOpenStudio={handleOpenStudio} />
      </main>

      <LandingFooter />
    </div>
  );
}

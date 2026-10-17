'use client';

import React from 'react';
import { User } from 'lucide-react';
import type { Segment } from '@/agent/client/segments';
import UserMessageAttachments from './UserMessageAttachments';
import MessageActionsMenu from './MessageActionsMenu';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { useBubbleActionMenu } from '@/hooks/useBubbleActionMenu';

export interface UserMessageItemProps {
  segments: Segment[];
}

/**
 * Renders a single user message turn including avatar, attachments,
 * markdown content bubble, and actions menu. Pure presentational block.
 */
function UserMessageItem({ segments }: UserMessageItemProps) {
  const {
    activeBubbleKey,
    openMenuKey,
    setOpenMenuKey,
    containerRef,
    handleBubbleClick,
  } = useBubbleActionMenu();

  return (
    <div
      ref={containerRef}
      className={`relative flex items-start gap-3.5 flex-row-reverse animate-slide-up ${
        openMenuKey ? 'z-30' : ''
      }`}
    >
      {/* User Avatar */}
      <div className="hidden sm:flex relative w-8 h-8 items-center justify-center shrink-0 mt-0.5 rounded-xl bg-surface-elevated border border-edge-hover/60 text-text-primary shadow-button">
        <User className="w-4 h-4 text-text-secondary" />
      </div>

      {/* Bubble Message Content */}
      <div className="flex flex-col min-w-0 gap-2 items-end w-fit max-w-[90%] sm:max-w-[82%] ms-auto">
        {segments.map((seg) => {
          const isActionActive = openMenuKey === seg.key || activeBubbleKey === seg.key;
          const isMenuOpen = openMenuKey === seg.key;

          if (seg.type === 'user-images' && seg.images && seg.images.length > 0) {
            return <UserMessageAttachments key={seg.key} images={seg.images} />;
          }

          if (seg.type === 'user-documents' && seg.documents && seg.documents.length > 0) {
            return <UserMessageAttachments key={seg.key} documents={seg.documents} />;
          }

          if (seg.type === 'user-text') {
            const userContent = seg.content || '';
            return (
              <div
                key={seg.key}
                onClick={(e) => handleBubbleClick(e, seg.key)}
                className={`group/bubble relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed transition-all duration-300 bg-primary text-surface border rounded-tr-xs shadow-card animate-slide-up w-fit max-w-full cursor-default select-none ${
                  isActionActive
                    ? 'border-primary-hover shadow-glow-primary/20'
                    : 'border-primary hover:border-primary-hover hover:shadow-glow-primary/20'
                } ${isMenuOpen ? 'z-30' : ''}`}
              >
                <div className="text-body text-surface leading-relaxed relative select-text cursor-text w-fit max-w-full">
                  <MarkdownRenderer
                    content={userContent}
                    variant="user"
                    className="text-body text-surface leading-relaxed relative select-text cursor-text"
                  />
                </div>

                {userContent && (
                  <div className="absolute inset-y-0 right-2 sm:right-3 pointer-events-none w-8 sm:w-7 flex flex-col justify-start">
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`sticky top-2 sm:top-3 -mt-2 sm:-mt-3 pointer-events-auto transition-all duration-150 ${
                        isActionActive
                          ? 'opacity-100 scale-100 z-30'
                          : 'opacity-0 scale-95 pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:scale-100 group-hover/bubble:pointer-events-auto focus-within:opacity-100 focus-within:scale-100 focus-within:pointer-events-auto z-10'
                      }`}
                    >
                      <MessageActionsMenu
                        textContent={userContent}
                        isOpen={isMenuOpen}
                        onOpenChange={(open) => setOpenMenuKey(open ? seg.key : null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

export default React.memo(UserMessageItem);

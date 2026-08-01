'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';
import {
  MODELS,
  MODEL_DESCRIPTIONS,
  MODEL_THINKING_LEVELS,
  THINKING_LEVEL_LABELS,
} from '@/lib/models';

interface ModelSelectorMenuProps {
  model: string;
  thinkingLevel: string;
  onModelSelect: (modelId: string) => void;
  onThinkingLevelChange: (level: string) => void;
}

export default function ModelSelectorMenu({
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
}: ModelSelectorMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'none' | 'effort' | 'more-models'>('none');
  const [mobileView, setMobileView] = useState<'main' | 'effort' | 'more-models'>('main');

  // Dynamic positioning for desktop boundary protection
  const [desktopPos, setDesktopPos] = useState({
    vertical: 'bottom-full mb-2',
    horizontal: 'left-0',
    flyoutX: 'left-full ml-1.5',
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentModel = MODELS.find((m) => m.id === model);
  const currentModelThinkingConfig = MODEL_THINKING_LEVELS[model];

  const primaryModels = MODELS.length > 3 ? MODELS.slice(0, 3) : MODELS;
  const overflowModels = MODELS.length > 3 ? MODELS.slice(3) : [];

  const effortLabel =
    thinkingLevel && currentModelThinkingConfig
      ? THINKING_LEVEL_LABELS[thinkingLevel as keyof typeof THINKING_LEVEL_LABELS] || thinkingLevel
      : null;

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setActiveSubmenu('none');
    setMobileView('main');
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);
  }, []);

  // Desktop Screen Collision Detection
  const calculateDesktopPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const MAIN_MENU_WIDTH = 288; // w-72 = 18rem
    const FLYOUT_WIDTH = 256; // w-64 = 16rem
    const MENU_HEIGHT = 300;

    // Vertical positioning (open down if near top of screen)
    let vertical = 'bottom-full mb-2';
    if (rect.top < MENU_HEIGHT && viewportHeight - rect.bottom > rect.top) {
      vertical = 'top-full mt-2';
    }

    // Horizontal alignment of main popover menu
    let horizontal = 'left-0';
    if (rect.left + MAIN_MENU_WIDTH > viewportWidth) {
      horizontal = 'right-0';
    }

    // Flyout direction (fly left if near right screen edge)
    let flyoutX = 'left-full ml-1.5';
    const mainMenuLeft = horizontal === 'left-0' ? rect.left : rect.right - MAIN_MENU_WIDTH;
    if (mainMenuLeft + MAIN_MENU_WIDTH + FLYOUT_WIDTH > viewportWidth) {
      flyoutX = 'right-full mr-1.5';
    }

    setDesktopPos({ vertical, horizontal, flyoutX });
  }, []);

  useEffect(() => {
    if (menuOpen) {
      calculateDesktopPosition();
      window.addEventListener('resize', calculateDesktopPosition);
      return () => window.removeEventListener('resize', calculateDesktopPosition);
    }
  }, [menuOpen, calculateDesktopPosition]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeMenu]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        closeMenu();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, closeMenu]);

  // Lock body scroll when mobile modal is active
  useEffect(() => {
    if (menuOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleSubmenuEnter = (type: 'effort' | 'more-models') => {
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);
    setActiveSubmenu(type);
  };

  const handleSubmenuLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu('none');
    }, 150);
  };

  return (
    <div className="relative flex items-center">
      {/* TRIGGER BUTTON */}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="true"
        onClick={() => {
          if (menuOpen) {
            closeMenu();
          } else {
            setMenuOpen(true);
          }
        }}
        className={`flex items-center gap-1.5 text-xs font-medium transition-all rounded-lg px-2.5 py-1.5 cursor-pointer shrink-0 border select-none ${menuOpen
            ? 'bg-surface-hover text-text-primary border-edge-hover'
            : 'text-text-muted hover:text-text-primary bg-surface-base hover:bg-surface-hover/60 border-edge-raised'
          }`}
      >
        <span className="font-semibold text-text-primary">{currentModel?.label || 'Model'}</span>
        {effortLabel && (
          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-surface-hover text-text-muted font-normal capitalize border border-edge-default">
            {effortLabel}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${menuOpen ? 'rotate-180 text-text-primary' : ''
            }`}
        />
      </button>

      {/* MENU CONTAINERS */}
      {menuOpen && (
        <>
          {/* ========================================== */}
          {/* 1. DESKTOP POPOVER MENU (sm:block hidden)  */}
          {/* ========================================== */}
          <div
            ref={menuRef}
            className={`hidden sm:block absolute ${desktopPos.vertical} ${desktopPos.horizontal} w-72 bg-surface-elevated border border-edge-hover rounded-2xl shadow-2xl p-1.5 text-sm z-50 animate-in fade-in zoom-in-95 duration-100`}
          >
            {/* Primary Models */}
            <div className="space-y-0.5">
              {primaryModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onModelSelect(m.id);
                    closeMenu();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl hover:bg-surface-hover flex items-start justify-between group transition-colors cursor-pointer ${m.id === model ? 'bg-surface-hover/70' : ''
                    }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-text-primary group-hover:text-text-bright">
                      {m.label}
                    </span>
                    {MODEL_DESCRIPTIONS[m.id] && (
                      <span className="text-[11px] text-text-muted line-clamp-1">
                        {MODEL_DESCRIPTIONS[m.id]}
                      </span>
                    )}
                  </div>
                  {m.id === model && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>

            <div className="h-px bg-edge-default my-1.5 mx-1" />

            {/* Desktop Submenus */}
            <div className="space-y-0.5">
              {/* Effort Submenu */}
              {currentModelThinkingConfig && (
                <div
                  className="relative"
                  onMouseEnter={() => handleSubmenuEnter('effort')}
                  onMouseLeave={handleSubmenuLeave}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSubmenu((prev) => (prev === 'effort' ? 'none' : 'effort'))
                    }
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${activeSubmenu === 'effort'
                        ? 'bg-surface-hover text-text-primary'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                      }`}
                  >
                    <span>Effort</span>
                    <div className="flex items-center gap-1 text-text-muted">
                      <span className="text-text-faint capitalize">{effortLabel || 'Default'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Effort Submenu Flyout (Calculated Safe Boundary) */}
                  {activeSubmenu === 'effort' && (
                    <div
                      className={`absolute top-0 ${desktopPos.flyoutX} w-48 bg-surface-elevated border border-edge-hover rounded-xl shadow-2xl p-1.5 space-y-0.5 z-50 animate-in fade-in zoom-in-95 duration-100`}
                    >
                      <div className="px-2.5 py-1 text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                        Thinking Level
                      </div>
                      {currentModelThinkingConfig.levels.map((level) => {
                        const label =
                          THINKING_LEVEL_LABELS[level as keyof typeof THINKING_LEVEL_LABELS] || level;
                        const isSelected = thinkingLevel === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => {
                              onThinkingLevelChange(level);
                              closeMenu();
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isSelected
                                ? 'bg-primary-soft text-primary font-medium'
                                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                              }`}
                          >
                            <span className="capitalize">{label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* More Models Submenu */}
              {overflowModels.length > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => handleSubmenuEnter('more-models')}
                  onMouseLeave={handleSubmenuLeave}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSubmenu((prev) => (prev === 'more-models' ? 'none' : 'more-models'))
                    }
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${activeSubmenu === 'more-models'
                        ? 'bg-surface-hover text-text-primary'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                      }`}
                  >
                    <span>More models</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                  </button>

                  {/* More Models Submenu Flyout (Calculated Safe Boundary) */}
                  {activeSubmenu === 'more-models' && (
                    <div
                      className={`absolute top-0 ${desktopPos.flyoutX} w-64 bg-surface-elevated border border-edge-hover rounded-xl shadow-2xl p-1.5 space-y-0.5 z-50 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100`}
                    >
                      <div className="px-2.5 py-1 text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                        Other Models
                      </div>
                      {overflowModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onModelSelect(m.id);
                            closeMenu();
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-surface-hover flex items-start justify-between group transition-colors cursor-pointer ${m.id === model ? 'bg-surface-hover/70' : ''
                            }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-text-primary group-hover:text-text-bright">
                              {m.label}
                            </span>
                            {MODEL_DESCRIPTIONS[m.id] && (
                              <span className="text-[11px] text-text-muted line-clamp-1">
                                {MODEL_DESCRIPTIONS[m.id]}
                              </span>
                            )}
                          </div>
                          {m.id === model && (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================== */}
          {/* 2. MOBILE MODAL DRAWER (sm:hidden block)   */}
          {/* ========================================== */}
          <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={closeMenu}
            />

            {/* Bottom Sheet Modal Container */}
            <div
              ref={menuRef}
              className="relative w-full bg-surface-elevated border-t border-edge-hover rounded-t-3xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-200 z-10 max-h-[85vh] flex flex-col"
            >
              {/* Drag Handlebar */}
              <div className="w-10 h-1 bg-edge-hover rounded-full mx-auto mb-3 shrink-0 opacity-80" />

              {/* HEADER */}
              <div className="flex items-center justify-between pb-3 border-b border-edge-default shrink-0">
                <div className="w-16 flex items-center">
                  {mobileView !== 'main' && (
                    <button
                      type="button"
                      onClick={() => setMobileView('main')}
                      className="flex items-center gap-0.5 text-xs font-semibold text-text-muted hover:text-text-primary p-1 -ml-1 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                  )}
                </div>

                <span className="text-xs font-semibold text-text-primary text-center uppercase tracking-wider">
                  {mobileView === 'main' && 'Select Model'}
                  {mobileView === 'effort' && 'Thinking Effort'}
                  {mobileView === 'more-models' && 'More Models'}
                </span>

                <div className="w-16 flex justify-end">
                  <button
                    type="button"
                    onClick={closeMenu}
                    className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MAIN CAROUSEL / SLIDE AREA */}
              <div className="overflow-hidden w-full pt-3 flex-1">
                <div
                  className="flex w-full transition-transform duration-300 ease-out"
                  style={{
                    transform:
                      mobileView === 'main'
                        ? 'translateX(0%)'
                        : mobileView === 'effort'
                          ? 'translateX(-100%)'
                          : 'translateX(-200%)',
                  }}
                >
                  {/* PANEL 1: MAIN VIEW */}
                  <div className="w-full shrink-0 space-y-3 pr-1 overflow-y-auto max-h-[60vh]">
                    {/* Primary Models */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold text-text-faint uppercase tracking-wider px-1">
                        Featured
                      </div>
                      {primaryModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onModelSelect(m.id);
                            closeMenu();
                          }}
                          className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-colors ${m.id === model
                              ? 'bg-surface-hover border border-edge-hover'
                              : 'hover:bg-surface-hover/50 border border-transparent'
                            }`}
                        >
                          <div className="flex flex-col gap-0.5 pr-2">
                            <span className="text-xs font-semibold text-text-primary">
                              {m.label}
                            </span>
                            {MODEL_DESCRIPTIONS[m.id] && (
                              <span className="text-[11px] text-text-muted line-clamp-2">
                                {MODEL_DESCRIPTIONS[m.id]}
                              </span>
                            )}
                          </div>
                          {m.id === model && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      ))}
                    </div>

                    <div className="h-px bg-edge-default my-2" />

                    {/* Navigation Buttons for Sub-views */}
                    <div className="space-y-1.5">
                      {/* Effort Slide Button */}
                      {currentModelThinkingConfig && (
                        <button
                          type="button"
                          onClick={() => setMobileView('effort')}
                          className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface-base hover:bg-surface-hover/60 border border-edge-default text-xs font-medium transition-colors"
                        >
                          <div className="flex items-center gap-2 text-text-primary">
                            <SlidersHorizontal className="w-4 h-4 text-text-muted" />
                            <span>Effort</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-text-muted">
                            <span className="capitalize text-text-faint">
                              {effortLabel || 'Default'}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>
                      )}

                      {/* More Models Slide Button */}
                      {overflowModels.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setMobileView('more-models')}
                          className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface-base hover:bg-surface-hover/60 border border-edge-default text-xs font-medium transition-colors"
                        >
                          <div className="flex items-center gap-2 text-text-primary">
                            <Layers className="w-4 h-4 text-text-muted" />
                            <span>More models</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-text-muted">
                            <span className="text-text-faint">{overflowModels.length} models</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PANEL 2: EFFORT VIEW */}
                  <div className="w-full shrink-0 space-y-1 px-1 overflow-y-auto max-h-[60vh]">
                    {currentModelThinkingConfig?.levels.map((level) => {
                      const label =
                        THINKING_LEVEL_LABELS[level as keyof typeof THINKING_LEVEL_LABELS] || level;
                      const isSelected = thinkingLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => {
                            onThinkingLevelChange(level);
                            setMobileView('main');
                          }}
                          className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-xs font-medium transition-colors ${isSelected
                              ? 'bg-primary-soft text-primary font-semibold ring-1 ring-primary/30'
                              : 'bg-surface-base hover:bg-surface-hover text-text-primary border border-edge-default'
                            }`}
                        >
                          <span className="capitalize">{label}</span>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* PANEL 3: MORE MODELS VIEW */}
                  <div className="w-full shrink-0 space-y-1.5 px-1 overflow-y-auto max-h-[60vh]">
                    {overflowModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onModelSelect(m.id);
                          closeMenu();
                        }}
                        className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-colors ${m.id === model
                            ? 'bg-surface-hover border border-edge-hover'
                            : 'hover:bg-surface-hover/50 border border-edge-default'
                          }`}
                      >
                        <div className="flex flex-col gap-0.5 pr-2">
                          <span className="text-xs font-semibold text-text-primary">{m.label}</span>
                          {MODEL_DESCRIPTIONS[m.id] && (
                            <span className="text-[11px] text-text-muted line-clamp-2">
                              {MODEL_DESCRIPTIONS[m.id]}
                            </span>
                          )}
                        </div>
                        {m.id === model && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
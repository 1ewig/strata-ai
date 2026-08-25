'use client';

import React from 'react';

export type CompactionDividerVariant = 'default' | 'danger' | 'warning' | 'info';
export type CompactionDividerLineStyle = 'gradient' | 'solid' | 'dashed';

export interface CompactionDividerProps extends React.ComponentPropsWithoutRef<'div'> {
  label: string;
  variant?: CompactionDividerVariant;
  icon?: React.ReactNode;
  lineStyle?: CompactionDividerLineStyle;
}

const VARIANT_STYLES: Record<
  CompactionDividerVariant,
  {
    pill: string;
    lineSolid: string;
    lineGradLeft: string;
    lineGradRight: string;
    iconColor: string;
  }
> = {
  default: {
    pill: 'bg-surface-elevated/95 dark:bg-surface-elevated/90 border-edge-raised text-text-muted dark:text-text-secondary',
    lineSolid: 'border-edge-raised',
    lineGradLeft: 'bg-gradient-to-r from-transparent to-edge-raised',
    lineGradRight: 'bg-gradient-to-l from-transparent to-edge-raised',
    iconColor: 'text-text-muted',
  },
  danger: {
    pill: 'bg-danger-soft/90 dark:bg-danger-soft/80 border-danger/40 text-danger',
    lineSolid: 'border-danger/30 dark:border-danger/40',
    lineGradLeft: 'bg-gradient-to-r from-transparent to-danger/40',
    lineGradRight: 'bg-gradient-to-l from-transparent to-danger/40',
    iconColor: 'text-danger',
  },
  warning: {
    pill: 'bg-warning-soft/90 dark:bg-warning-soft/80 border-warning/40 text-warning',
    lineSolid: 'border-warning/30 dark:border-warning/40',
    lineGradLeft: 'bg-gradient-to-r from-transparent to-warning/40',
    lineGradRight: 'bg-gradient-to-l from-transparent to-warning/40',
    iconColor: 'text-warning',
  },
  info: {
    pill: 'bg-info-soft/90 dark:bg-info-soft/80 border-info/40 text-info',
    lineSolid: 'border-info/30 dark:border-info/40',
    lineGradLeft: 'bg-gradient-to-r from-transparent to-info/40',
    lineGradRight: 'bg-gradient-to-l from-transparent to-info/40',
    iconColor: 'text-info',
  },
};

function CompactionDivider({
  label,
  variant = 'default',
  icon,
  lineStyle = 'gradient',
  className = '',
  ...props
}: CompactionDividerProps) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default;

  const renderLeftLine = () => {
    if (lineStyle === 'solid') {
      return <div className={`flex-1 border-t ${styles.lineSolid}`} />;
    }
    if (lineStyle === 'dashed') {
      return <div className={`flex-1 border-t border-dashed ${styles.lineSolid}`} />;
    }
    return <div className={`flex-1 h-px ${styles.lineGradLeft}`} />;
  };

  const renderRightLine = () => {
    if (lineStyle === 'solid') {
      return <div className={`flex-1 border-t ${styles.lineSolid}`} />;
    }
    if (lineStyle === 'dashed') {
      return <div className={`flex-1 border-t border-dashed ${styles.lineSolid}`} />;
    }
    return <div className={`flex-1 h-px ${styles.lineGradRight}`} />;
  };

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="horizontal"
      className={`relative my-6 flex items-center gap-3 fade-in ${className}`}
      {...props}
    >
      {/* Left divider segment */}
      {renderLeftLine()}

      {/* Centered pill label (no line behind it) */}
      <div
        className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-micro font-semibold uppercase tracking-wider shadow-button backdrop-blur-md transition-colors select-none ${styles.pill}`}
      >
        {icon && (
          <span className={`inline-flex items-center shrink-0 ${styles.iconColor}`}>
            {icon}
          </span>
        )}
        <span>{label}</span>
      </div>

      {/* Right divider segment */}
      {renderRightLine()}
    </div>
  );
}

export default React.memo(CompactionDivider);
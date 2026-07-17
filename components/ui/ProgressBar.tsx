'use client';

import { motion } from 'motion/react';

interface ProgressBarProps {
  value: number;
  className?: string;
  animated?: boolean;
  size?: 'sm' | 'md';
}

export default function ProgressBar({ value, className = '', animated = false, size = 'sm' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className={`w-full bg-zinc-950 rounded-full ${height} overflow-hidden ${className}`}>
      {animated ? (
        <motion.div
          className="bg-emerald-500 h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.3 }}
        />
      ) : (
        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${clamped}%` }} />
      )}
    </div>
  );
}

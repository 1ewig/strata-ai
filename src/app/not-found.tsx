import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-surface-base text-text-bright flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-raised border border-edge-raised flex items-center justify-center mb-6">
        <span className="text-xl font-bold text-primary">404</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-text-bright mb-2 font-display">Page Not Found</h1>
      <p className="text-sm text-text-muted max-w-sm mb-6">
        The task, project, or page you are looking for does not exist or has been moved.
      </p>
      <Link 
        href="/" 
        className="text-xs font-semibold text-surface bg-primary hover:bg-primary-hover px-4 py-2.5 rounded-xl transition-all shadow-button focus:outline-none"
      >
        Return Home
      </Link>
    </div>
  );
}

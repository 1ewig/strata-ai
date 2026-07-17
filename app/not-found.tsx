import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
        <span className="text-xl font-bold text-emerald-400">404</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-2">Page Not Found</h1>
      <p className="text-sm text-zinc-500 max-w-sm mb-6">
        The task, project, or page you are looking for does not exist or has been moved.
      </p>
      <Link 
        href="/" 
        className="text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.15)] focus:outline-none"
      >
        Return Home
      </Link>
    </div>
  );
}

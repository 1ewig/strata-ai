'use client';

import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { getGoogleFaviconUrl } from '@/lib/urls';

export interface FaviconImageProps {
  url: string;
  faviconUrl?: string;
  className?: string;
  size?: number;
}

/**
 * Resilient favicon image component that resolves Tavily favicons with an automatic
 * fallback to Google S2 Favicon service, and gracefully falls back to a Lucide Globe icon on error.
 */
export function FaviconImage({
  url,
  faviconUrl,
  className = 'w-3.5 h-3.5',
  size = 32,
}: FaviconImageProps) {
  const initialSrc = faviconUrl || (url ? getGoogleFaviconUrl(url, size) : '');
  const [src, setSrc] = useState(initialSrc);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const nextSrc = faviconUrl || (url ? getGoogleFaviconUrl(url, size) : '');
    setSrc(nextSrc);
    setHasFailed(false);
  }, [url, faviconUrl, size]);

  const handleError = () => {
    // If the Tavily-provided custom faviconUrl fails, fallback to Google S2
    if (faviconUrl && src === faviconUrl && url) {
      setSrc(getGoogleFaviconUrl(url, size));
    } else {
      // Both failed, gracefully render Lucide icon
      setHasFailed(true);
    }
  };

  if (!url || hasFailed || !src) {
    return <Globe className={`${className} text-text-muted shrink-0`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={handleError}
      className={`${className} object-contain shrink-0`}
    />
  );
}

export default React.memo(FaviconImage);

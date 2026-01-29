'use client';

/**
 * Meta Pixel Provider Component
 * Features: META-001, META-002
 *
 * Initializes Meta Pixel and tracks page views
 */

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initMetaPixel, trackMetaPageView } from '@/lib/analytics/meta-pixel';

interface MetaPixelProviderProps {
  children: React.ReactNode;
}

export function MetaPixelProvider({ children }: MetaPixelProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize Meta Pixel on mount
  useEffect(() => {
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

    if (!pixelId) {
      console.warn('Meta Pixel ID not configured. Set NEXT_PUBLIC_META_PIXEL_ID in .env');
      return;
    }

    initMetaPixel(pixelId);
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_META_PIXEL_ID) {
      trackMetaPageView();
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { TopProgressBar } from './TopProgressBar';

export function RouteNavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return <TopProgressBar isLoading={isNavigating} />;
}

'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

export function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <>{children}</>;
}

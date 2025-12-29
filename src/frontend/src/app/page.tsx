'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGuard } from '@/components/AuthGuard';

export default function HomePage() {
  return (
    <AuthGuard>
      <MainLayout />
    </AuthGuard>
  );
}

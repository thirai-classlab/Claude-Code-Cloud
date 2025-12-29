'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { BaseLayout } from '@/components/layout/BaseLayout';
import { HomePage } from '@/components/pages/HomePage';

export default function Home() {
  return (
    <AuthGuard>
      <BaseLayout>
        <HomePage />
      </BaseLayout>
    </AuthGuard>
  );
}

'use client';

import { SessionPage } from '@/components/pages/SessionPage';
import { useRouteSync } from '@/hooks/useRouteSync';

interface SessionRouteProps {
  params: {
    id: string;
    sessionId: string;
  };
}

export default function SessionRoute({ params }: SessionRouteProps) {
  // Sync session ID with stores (project ID is synced in layout)
  useRouteSync({ sessionId: params.sessionId });

  // Layout handles: AuthGuard, BaseLayout, SplitLayout (right panel)
  // This page only renders the main content (chat)
  return (
    <SessionPage
      projectId={params.id}
      sessionId={params.sessionId}
    />
  );
}

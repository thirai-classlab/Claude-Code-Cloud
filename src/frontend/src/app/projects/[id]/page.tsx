'use client';

import { ProjectPage } from '@/components/pages/ProjectPage';

interface ProjectRouteProps {
  params: {
    id: string;
  };
}

export default function ProjectRoute({ params }: ProjectRouteProps) {
  // Layout handles: AuthGuard, BaseLayout, SplitLayout (right panel)
  // This page only renders the main content
  return <ProjectPage projectId={params.id} />;
}

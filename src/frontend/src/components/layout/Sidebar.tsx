/**
 * Sidebar Component
 * Displays project and session hierarchy
 */
'use client';

import React from 'react';
import { ProjectList } from '@/components/project/ProjectList';

export const Sidebar: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-bg-secondary overflow-hidden" role="complementary" aria-label="プロジェクトとセッション">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
          プロジェクト
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ProjectList />
      </div>
    </div>
  );
};

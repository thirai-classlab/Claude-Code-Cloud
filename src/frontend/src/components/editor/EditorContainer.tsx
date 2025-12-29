'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { MCPSettingsEditor } from './MCPSettingsEditor';
import { AgentSettingsEditor } from './AgentSettingsEditor';
import { CommandSettingsEditor } from './CommandSettingsEditor';
import { SkillsSettingsEditor } from './SkillsSettingsEditor';
import { CronSettingsEditor } from './CronSettingsEditor';
import { ProjectSettingsEditor } from './ProjectSettingsEditor';
import { PricingEditor } from './PricingEditor';
import { useUIStore } from '@/stores/uiStore';

const CodeServerEditor = dynamic(
  () => import('./CodeServerEditor').then((mod) => mod.CodeServerEditor),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

type EditorTab = 'vscode' | 'mcp' | 'agents' | 'commands' | 'skills' | 'cron' | 'settings' | 'pricing';

// Tab configuration with icons
const EDITOR_TABS: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'vscode',
    label: 'VSCode',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.583 2L6.75 11.667l-3.75-3v6.666l3.75-3L17.583 22 22 19.75V4.25L17.583 2zm-1.583 14.5L9.5 12l6.5-4.5v9z"/>
      </svg>
    ),
  },
  {
    id: 'mcp',
    label: 'MCP',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
      </svg>
    ),
  },
  {
    id: 'agents',
    label: 'サブエージェント',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'commands',
    label: 'コマンド',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'skills',
    label: 'スキル',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'cron',
    label: 'スケジュール',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'pricing',
    label: '料金',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: '設定',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

interface EditorContainerProps {
  projectId: string;
  workspacePath: string;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  projectId,
  workspacePath,
}) => {
  const { isEditorPanelOpen, activeEditorTab, setActiveEditorTab, openEditorTab, toggleEditorPanel } = useUIStore();
  const [pendingFile, setPendingFile] = useState<string | null>(null);

  // Collapsed view: vertical icon bar on the right
  if (!isEditorPanelOpen) {
    return (
      <div className="h-full flex flex-col items-center bg-bg-secondary border-l border-border-subtle py-2 w-12">
        {EDITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => openEditorTab(tab.id)}
            className={`p-2 rounded-lg mb-1 transition-colors ${
              activeEditorTab === tab.id
                ? 'text-accent bg-bg-tertiary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>
    );
  }

  // Expanded view: full panel with tabs
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center border-b border-border bg-bg-secondary">
        {/* Collapse button */}
        <button
          onClick={toggleEditorPanel}
          className="px-2 py-2 text-text-secondary hover:text-text-primary transition-colors"
          title="パネルを折りたたむ"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        {/* Tab buttons */}
        {EDITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveEditorTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeEditorTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="w-4 h-4">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeEditorTab === 'vscode' && (
          <CodeServerEditor
            workspacePath={workspacePath}
            fileToOpen={pendingFile}
            onFileOpened={() => setPendingFile(null)}
          />
        )}
        {activeEditorTab === 'mcp' && (
          <MCPSettingsEditor projectId={projectId} />
        )}
        {activeEditorTab === 'agents' && (
          <AgentSettingsEditor projectId={projectId} />
        )}
        {activeEditorTab === 'commands' && (
          <CommandSettingsEditor projectId={projectId} />
        )}
        {activeEditorTab === 'skills' && (
          <SkillsSettingsEditor projectId={projectId} />
        )}
        {activeEditorTab === 'cron' && (
          <CronSettingsEditor projectId={projectId} />
        )}
        {activeEditorTab === 'settings' && (
          <ProjectSettingsEditor projectId={projectId} />
        )}
        {activeEditorTab === 'pricing' && (
          <PricingEditor projectId={projectId} />
        )}
      </div>
    </div>
  );
};

const EditorSkeleton: React.FC = () => (
  <div className="h-full w-full flex items-center justify-center bg-bg-secondary">
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-48 bg-bg-tertiary rounded"></div>
      <div className="h-4 w-64 bg-bg-tertiary rounded"></div>
      <div className="h-4 w-56 bg-bg-tertiary rounded"></div>
    </div>
  </div>
);

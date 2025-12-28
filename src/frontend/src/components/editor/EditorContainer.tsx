'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MCPSettingsEditor } from './MCPSettingsEditor';
import { AgentSettingsEditor } from './AgentSettingsEditor';
import { CommandSettingsEditor } from './CommandSettingsEditor';
import { SkillsSettingsEditor } from './SkillsSettingsEditor';
import { CronSettingsEditor } from './CronSettingsEditor';

const CodeServerEditor = dynamic(
  () => import('./CodeServerEditor').then((mod) => mod.CodeServerEditor),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

type EditorTab = 'vscode' | 'mcp' | 'agents' | 'commands' | 'skills' | 'cron';

interface EditorContainerProps {
  projectId: string;
  workspacePath: string;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  projectId,
  workspacePath,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('vscode');
  const [pendingFile, setPendingFile] = useState<string | null>(null);

  // Handle file creation from settings editors
  const handleFileCreated = useCallback((relativePath: string) => {
    // Store the file path and switch to VSCode tab
    setPendingFile(relativePath);
    setActiveTab('vscode');
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center border-b bg-bg-secondary">
        <button
          onClick={() => setActiveTab('vscode')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'vscode'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.583 2L6.75 11.667l-3.75-3v6.666l3.75-3L17.583 22 22 19.75V4.25L17.583 2zm-1.583 14.5L9.5 12l6.5-4.5v9z"/>
          </svg>
          VSCode
        </button>
        <button
          onClick={() => setActiveTab('mcp')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'mcp'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          MCP
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'agents'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Agents
        </button>
        <button
          onClick={() => setActiveTab('commands')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'commands'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Commands
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'skills'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Skills
        </button>
        <button
          onClick={() => setActiveTab('cron')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'cron'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Cron
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'vscode' && (
          <CodeServerEditor
            workspacePath={workspacePath}
            fileToOpen={pendingFile}
            onFileOpened={() => setPendingFile(null)}
          />
        )}
        {activeTab === 'mcp' && (
          <MCPSettingsEditor projectId={projectId} />
        )}
        {activeTab === 'agents' && (
          <AgentSettingsEditor projectId={projectId} onFileCreated={handleFileCreated} />
        )}
        {activeTab === 'commands' && (
          <CommandSettingsEditor projectId={projectId} onFileCreated={handleFileCreated} />
        )}
        {activeTab === 'skills' && (
          <SkillsSettingsEditor projectId={projectId} onFileCreated={handleFileCreated} />
        )}
        {activeTab === 'cron' && (
          <CronSettingsEditor projectId={projectId} />
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

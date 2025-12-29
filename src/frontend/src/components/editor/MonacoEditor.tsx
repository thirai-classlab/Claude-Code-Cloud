'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useEditorStore } from '@/stores/editorStore';
import { useFiles } from '@/hooks/useFiles';

interface MonacoEditorProps {
  projectId: string;
  filePath?: string;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ projectId, filePath }) => {
  const { theme, fontSize } = useEditorStore();
  const { readFile, writeFile } = useFiles({ projectId, autoLoad: false });

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const originalContentRef = useRef<string>('');

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
      yml: 'yaml',
      yaml: 'yaml',
      sh: 'shell',
      bash: 'shell',
      txt: 'plaintext',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const loadFileContent = useCallback(
    async (path: string) => {
      if (!path) return;

      setLoading(true);
      setError(null);

      try {
        const response = await readFile(path);
        setContent(response.content);
        originalContentRef.current = response.content;
        setIsDirty(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load file';
        setError(errorMessage);
        setContent('');
      } finally {
        setLoading(false);
      }
    },
    [readFile]
  );

  const saveFileContent = useCallback(async () => {
    if (!filePath || !isDirty) return;

    setIsSaving(true);
    setError(null);

    try {
      await writeFile(filePath, content);
      originalContentRef.current = content;
      setIsDirty(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save file';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [filePath, content, isDirty, writeFile]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFileContent();
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setIsDirty(newContent !== originalContentRef.current);
  };

  useEffect(() => {
    if (filePath) {
      loadFileContent(filePath);
    } else {
      setContent('');
      setIsDirty(false);
      originalContentRef.current = '';
    }
  }, [filePath, loadFileContent]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-6xl">📝</div>
          <h3 className="text-lg font-medium text-text-primary">No File Selected</h3>
          <p className="text-sm text-text-secondary max-w-md">
            Select a file from the file tree to start editing
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <span className="text-sm text-text-secondary">Loading file...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-bg-primary">
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <div className="text-red-500 text-4xl">⚠️</div>
            <h3 className="text-lg font-semibold text-text-primary">Error Loading File</h3>
            <p className="text-sm text-text-secondary max-w-md">{error}</p>
            <button
              onClick={() => filePath && loadFileContent(filePath)}
              className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-primary truncate max-w-md">
            {filePath}
          </span>
          {isDirty && (
            <span className="text-xs text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded">
              Modified
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={saveFileContent}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon />
                  Save (Ctrl+S)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguageFromPath(filePath)}
          theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize,
            automaticLayout: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            rulers: [80, 120],
            formatOnPaste: true,
            formatOnType: true,
            contextmenu: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'top',
          }}
        />
      </div>
    </div>
  );
};

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
    />
  </svg>
);

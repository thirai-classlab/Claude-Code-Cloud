'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';

interface CodeServerEditorProps {
  workspacePath: string;
  fileToOpen?: string | null;
  onFileOpened?: () => void;
}

export const CodeServerEditor: React.FC<CodeServerEditorProps> = ({
  workspacePath,
  fileToOpen,
  onFileOpened,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { isFullscreen, setFullscreen } = useEditorStore();

  const codeServerUrl =
    process.env.NEXT_PUBLIC_CODE_SERVER_URL || 'http://localhost:8080';

  // Map backend workspace path to code-server workspace path
  const mappedWorkspacePath = workspacePath.replace(
    /^\/app\/workspace\//,
    '/home/coder/workspace/'
  );

  // Build editor URL with optional file to open
  let editorUrl = `${codeServerUrl}/?folder=${encodeURIComponent(mappedWorkspacePath)}`;
  if (fileToOpen) {
    const fullFilePath = `${mappedWorkspacePath}/${fileToOpen}`;
    editorUrl = `${codeServerUrl}/?folder=${encodeURIComponent(mappedWorkspacePath)}&file=${encodeURIComponent(fullFilePath)}`;
  }

  // Notify parent when file is opened
  useEffect(() => {
    if (fileToOpen && onFileOpened) {
      // Give a small delay for the URL to be applied
      const timer = setTimeout(() => {
        onFileOpened();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [fileToOpen, onFileOpened]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await fetch(`${codeServerUrl}/healthz`, { mode: 'no-cors' });
        setHasError(false);
      } catch (error) {
        console.error('code-server connection failed:', error);
        setHasError(true);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [codeServerUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleReload = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setHasError(false);
      iframeRef.current.src = editorUrl;
    }
  };

  const handleOpenInNewTab = () => {
    window.open(editorUrl, '_blank');
  };

  const handleToggleFullscreen = () => {
    setFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`relative h-full w-full ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            VSCode Editor
          </span>
          {isLoading && (
            <span className="text-xs text-text-tertiary">Loading...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReload}
            className="p-2 hover:bg-bg-tertiary rounded"
            title="Reload"
          >
            <RefreshIcon />
          </button>
          <button
            onClick={handleToggleFullscreen}
            className="p-2 hover:bg-bg-tertiary rounded"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <FullscreenIcon />
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="p-2 hover:bg-bg-tertiary rounded"
            title="Open in new tab"
          >
            <ExternalLinkIcon />
          </button>
        </div>
      </div>

      <div className="relative h-[calc(100%-44px)]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-primary z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="text-sm text-text-secondary">
                Starting VSCode...
              </span>
            </div>
          </div>
        )}

        {hasError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-primary z-10">
            <div className="flex flex-col items-center gap-4 text-center p-6">
              <div className="text-red-500 text-4xl">⚠️</div>
              <h3 className="text-lg font-semibold text-text-primary">
                Cannot connect to VSCode
              </h3>
              <p className="text-sm text-text-secondary max-w-md">
                Please ensure code-server is running on port 8080.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleReload}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  Reconnect
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 bg-bg-tertiary text-text-primary rounded hover:bg-border"
                >
                  Open in New Tab
                </button>
              </div>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={editorUrl}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="clipboard-read; clipboard-write; cross-origin-isolated"
        />
      </div>
    </div>
  );
};

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const FullscreenIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
    />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

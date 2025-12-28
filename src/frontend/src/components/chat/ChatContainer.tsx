'use client';

import React, { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ThinkingIndicator } from './ThinkingIndicator';
import { StreamingText } from './StreamingText';
import { ToolExecutionGroup } from './ToolExecutionGroup';
import { useChat } from '@/hooks/useChat';

interface ChatContainerProps {
  sessionId: string;
  projectId?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ sessionId, projectId }) => {
  const {
    messages,
    currentStreamingMessage,
    toolExecutions,
    isStreaming,
    isThinking,
    isLoadingHistory,
    connectionStatus,
    sendMessage,
    interrupt,
  } = useChat({ sessionId });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage, toolExecutions]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">チャット</h2>
        <div className="flex items-center gap-3">
          {isStreaming && (
            <button
              onClick={interrupt}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              停止
            </button>
          )}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {connectionStatus === 'connected' ? '接続中' : connectionStatus === 'connecting' ? '接続待ち' : '切断'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
        {/* Loading History Indicator */}
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>チャット履歴を読み込み中...</span>
            </div>
          </div>
        )}

        <MessageList messages={messages} />

        {/* Streaming Message */}
        {currentStreamingMessage && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[80%] rounded-lg px-4 py-3 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  C
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Claude</span>
              </div>
              <StreamingText text={currentStreamingMessage} />
            </div>
          </div>
        )}

        {/* Tool Executions */}
        {toolExecutions.length > 0 && (
          <div className="mb-4">
            <ToolExecutionGroup executions={toolExecutions} />
          </div>
        )}

        {/* Thinking Indicator */}
        {isThinking && <ThinkingIndicator />}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <MessageInput
          onSend={sendMessage}
          disabled={isStreaming || connectionStatus !== 'connected'}
          projectId={projectId}
        />
      </div>
    </div>
  );
};

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
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-header border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">Chat</h2>
        <div className="flex items-center gap-3">
          {isStreaming && (
            <button
              onClick={interrupt}
              className="btn px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-all duration-fast"
            >
              Stop
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
            <span className="text-sm text-text-tertiary">
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4 bg-bg-primary">
        {/* Loading History Indicator */}
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-text-tertiary">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading chat history...</span>
            </div>
          </div>
        )}

        <MessageList messages={messages} />

        {/* Streaming Message */}
        {currentStreamingMessage && (
          <div className="message">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-bg-secondary text-text-primary border border-border">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-md bg-accent text-white flex items-center justify-center text-xs font-semibold">
                  C
                </div>
                <span className="text-base font-semibold text-text-primary">Claude</span>
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
      <div className="border-t border-border bg-bg-primary">
        <MessageInput
          onSend={sendMessage}
          disabled={isStreaming || connectionStatus !== 'connected'}
          projectId={projectId}
        />
      </div>
    </div>
  );
};

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ThinkingIndicator } from './ThinkingIndicator';
import { StreamingText } from './StreamingText';
import { ToolUseWithResultCard } from './ToolUseWithResultCard';
import { MarkdownContent } from './MarkdownContent';
import { QuestionCard } from './QuestionCard';
import { useChat } from '@/hooks/useChat';
import { projectsApi } from '@/lib/api';
import { ToolUseBlock, ToolResultBlock } from '@/types/message';

interface ChatContainerProps {
  sessionId: string;
  projectId?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ sessionId, projectId }) => {
  const {
    messages,
    currentStreamingMessage,
    toolExecutions,
    streamingContentBlocks,
    isStreaming,
    isThinking,
    isLoadingHistory,
    connectionStatus,
    sendMessage,
    interrupt,
    answerQuestion,
    pendingQuestion,
  } = useChat({ sessionId });

  const [costLimitError, setCostLimitError] = useState<string | null>(null);
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);

  // 利用制限をチェックしてからメッセージを送信
  const handleSendWithLimitCheck = useCallback(async (message: string) => {
    if (!projectId) {
      // projectIdがない場合は制限チェックなしで送信
      sendMessage(message);
      return;
    }

    setCostLimitError(null);
    setIsCheckingLimits(true);

    try {
      const limitCheck = await projectsApi.checkCostLimits(projectId);

      if (!limitCheck.can_use) {
        // 利用制限超過
        const exceededLabels = limitCheck.exceeded_limits.map(limit => {
          switch (limit) {
            case 'daily': return '1日';
            case 'weekly': return '7日';
            case 'monthly': return '30日';
            default: return limit;
          }
        }).join('、');

        setCostLimitError(`利用制限（${exceededLabels}）を超過しています。料金設定から制限を変更してください。`);
        return;
      }

      // 制限内なのでメッセージ送信
      sendMessage(message);
    } catch (error) {
      console.error('Failed to check cost limits:', error);
      // エラー時は制限チェックをスキップして送信を許可
      sendMessage(message);
    } finally {
      setIsCheckingLimits(false);
    }
  }, [projectId, sendMessage]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Handle scroll to detect if user has scrolled up manually
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Enable auto-scroll if user is near the bottom (within 100px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  }, []);

  // Auto-scroll to bottom when new content arrives (only if user hasn't scrolled up)
  useEffect(() => {
    if (shouldAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage, streamingContentBlocks, shouldAutoScroll]);

  // ツール使用とツール結果をペアリングするヘルパー関数
  const getToolResultForToolUse = (toolUseId: string): ToolResultBlock | undefined => {
    return streamingContentBlocks.find(
      (block): block is ToolResultBlock =>
        block.type === 'tool_result' && block.tool_use_id === toolUseId
    );
  };

  // ツール実行状態を取得するヘルパー関数
  const isToolExecuting = (toolUseId: string): boolean => {
    const execution = toolExecutions.find(e => e.tool_use_id === toolUseId);
    return execution?.status === 'executing' || execution?.status === 'pending';
  };

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
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 bg-bg-primary"
      >
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

        {/* Streaming Response - テキストとツールを時系列順に交互表示 */}
        {(streamingContentBlocks.length > 0 || isThinking) && (
          <div className="message">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-bg-secondary text-text-primary border border-border">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-md bg-accent text-white flex items-center justify-center text-xs font-semibold">
                  C
                </div>
                <span className="text-base font-semibold text-text-primary">Claude</span>
              </div>

              {/* Thinking Indicator - コンテンツがまだない場合のみ表示 */}
              {isThinking && streamingContentBlocks.length === 0 && !pendingQuestion && (
                <ThinkingIndicator />
              )}

              {/* コンテンツブロックを時系列順に表示 */}
              <div className="space-y-3">
                {streamingContentBlocks.map((block, index) => {
                  // テキストブロック
                  if (block.type === 'text') {
                    const isLastBlock = index === streamingContentBlocks.length - 1;
                    return (
                      <div key={`text-${index}`}>
                        {isLastBlock && isStreaming ? (
                          <StreamingText text={block.text} />
                        ) : (
                          <MarkdownContent content={block.text} />
                        )}
                      </div>
                    );
                  }

                  // ツール使用ブロック（AskUserQuestion 以外）
                  if (block.type === 'tool_use') {
                    const toolUse = block as ToolUseBlock;
                    // AskUserQuestion は専用UIで表示するのでスキップ
                    if (toolUse.name === 'AskUserQuestion') {
                      return null;
                    }
                    const toolResult = getToolResultForToolUse(toolUse.id);
                    const executing = isToolExecuting(toolUse.id);
                    return (
                      <ToolUseWithResultCard
                        key={`tool-${toolUse.id}`}
                        toolUse={toolUse}
                        toolResult={toolResult}
                        isExecuting={executing && !toolResult}
                      />
                    );
                  }

                  // tool_resultはtool_useと一緒に表示されるのでスキップ
                  return null;
                })}
              </div>

              {/* AskUserQuestion の質問カード */}
              {pendingQuestion && (
                <div className="mt-3">
                  <QuestionCard
                    toolUseId={pendingQuestion.toolUseId}
                    questions={pendingQuestion.questions}
                    onAnswer={answerQuestion}
                    disabled={connectionStatus !== 'connected'}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cost Limit Error */}
      {costLimitError && (
        <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{costLimitError}</span>
            <button
              onClick={() => setCostLimitError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-bg-primary">
        <MessageInput
          onSend={handleSendWithLimitCheck}
          disabled={isStreaming || isCheckingLimits || connectionStatus !== 'connected'}
          projectId={projectId}
        />
      </div>
    </div>
  );
};

'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ThinkingIndicator } from './ThinkingIndicator';
import { StreamingText } from './StreamingText';
import { ToolUseWithResultCard } from './ToolUseWithResultCard';
import { MarkdownContent } from './MarkdownContent';
import { QuestionCard } from './QuestionCard';
import { useChat } from '@/hooks/useChat';
import { useSessions } from '@/hooks/useSessions';
import { useProjectStore } from '@/stores/projectStore';
import { projectsApi, modelsApi } from '@/lib/api';
import { ToolUseBlock, ToolResultBlock, ContentBlock } from '@/types/message';

// Model type from API
interface ModelInfo {
  id: string;
  display_name: string;
  type: string;
}

// Fallback models if API is unavailable
const FALLBACK_MODELS: ModelInfo[] = [
  { id: 'claude-sonnet-4-20250514', display_name: 'Claude Sonnet 4', type: 'model' },
  { id: 'claude-opus-4-20250514', display_name: 'Claude Opus 4', type: 'model' },
  { id: 'claude-3-5-haiku-20241022', display_name: 'Claude 3.5 Haiku', type: 'model' },
];

// === Types ===
interface ChatContainerProps {
  sessionId: string;
  projectId?: string;
}

interface CostLimitState {
  error: string | null;
  isChecking: boolean;
}

// === Sub Components ===

// 接続ステータス表示
const ConnectionStatus: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = useMemo(() => {
    switch (status) {
      case 'connected':
        return { color: 'bg-emerald-500', text: 'Connected' };
      case 'connecting':
        return { color: 'bg-amber-500 animate-pulse', text: 'Connecting' };
      default:
        return { color: 'bg-red-500', text: 'Disconnected' };
    }
  }, [status]);

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
      <span className="text-sm text-text-tertiary">{statusConfig.text}</span>
    </div>
  );
};

// モデルセレクター
const ModelSelector: React.FC<{
  currentModel: string;
  onModelChange: (model: string) => void;
  disabled: boolean;
  models: ModelInfo[];
}> = ({ currentModel, onModelChange, disabled, models }) => {
  // Find current model in the list, or use a default display
  const currentModelInfo = models.find(m => m.id === currentModel);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-tertiary">Model:</span>
      <select
        value={currentModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className="text-xs bg-bg-secondary border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.display_name}
          </option>
        ))}
        {!currentModelInfo && (
          <option value={currentModel}>
            {currentModel}
          </option>
        )}
      </select>
    </div>
  );
};

// ヘッダー
const ChatHeader: React.FC<{
  isStreaming: boolean;
  connectionStatus: string;
  currentModel: string;
  onInterrupt: () => void;
  onModelChange: (model: string) => void;
  models: ModelInfo[];
}> = ({ isStreaming, connectionStatus, currentModel, onInterrupt, onModelChange, models }) => (
  <div className="flex items-center justify-between px-6 h-header border-b border-border">
    <h2 className="text-lg font-semibold text-text-primary">Chat</h2>
    <div className="flex items-center gap-4">
      <ModelSelector
        currentModel={currentModel}
        onModelChange={onModelChange}
        disabled={isStreaming}
        models={models}
      />
      {isStreaming && (
        <button
          onClick={onInterrupt}
          className="btn px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-all duration-fast"
        >
          Stop
        </button>
      )}
      <ConnectionStatus status={connectionStatus} />
    </div>
  </div>
);

// ローディングインジケーター
const LoadingIndicator: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <div className="flex items-center gap-3 text-text-tertiary">
      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span>Loading chat history...</span>
    </div>
  </div>
);

// コスト制限エラー表示
const CostLimitError: React.FC<{
  error: string;
  onDismiss: () => void;
}> = ({ error, onDismiss }) => (
  <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/30">
    <div className="flex items-center gap-2 text-red-400 text-sm">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>{error}</span>
      <button onClick={onDismiss} className="ml-auto text-red-400 hover:text-red-300">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
);

// ストリーミングメッセージ表示
const StreamingMessage: React.FC<{
  streamingContentBlocks: ContentBlock[];
  toolExecutions: Array<{ tool_use_id: string; status: string }>;
  isThinking: boolean;
  isStreaming: boolean;
  pendingQuestion: { toolUseId: string; questions: Array<{ question: string; header: string; options: Array<{ label: string; description: string }>; multiSelect: boolean }> } | null;
  connectionStatus: string;
  onAnswerQuestion: (toolUseId: string, answers: Record<string, string>) => void;
}> = ({
  streamingContentBlocks,
  toolExecutions,
  isThinking,
  isStreaming,
  pendingQuestion,
  connectionStatus,
  onAnswerQuestion,
}) => {
  // ツール結果を取得
  const getToolResultForToolUse = useCallback((toolUseId: string): ToolResultBlock | undefined => {
    return streamingContentBlocks.find(
      (block): block is ToolResultBlock =>
        block.type === 'tool_result' && block.tool_use_id === toolUseId
    );
  }, [streamingContentBlocks]);

  // ツール実行中かチェック
  const isToolExecuting = useCallback((toolUseId: string): boolean => {
    const execution = toolExecutions.find(e => e.tool_use_id === toolUseId);
    return execution?.status === 'executing' || execution?.status === 'pending';
  }, [toolExecutions]);

  if (streamingContentBlocks.length === 0 && !isThinking) {
    return null;
  }

  return (
    <div className="message">
      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-bg-secondary text-text-primary border border-border">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-md bg-accent text-white flex items-center justify-center text-xs font-semibold">
            C
          </div>
          <span className="text-base font-semibold text-text-primary">Claude</span>
        </div>

        {/* Thinking Indicator */}
        {isThinking && streamingContentBlocks.length === 0 && !pendingQuestion && (
          <ThinkingIndicator />
        )}

        {/* Content Blocks */}
        <div className="space-y-3">
          {streamingContentBlocks.map((block, index) => {
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

            if (block.type === 'tool_use') {
              const toolUse = block as ToolUseBlock;
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

            return null;
          })}
        </div>

        {/* Question Card */}
        {pendingQuestion && (
          <div className="mt-3">
            <QuestionCard
              toolUseId={pendingQuestion.toolUseId}
              questions={pendingQuestion.questions}
              onAnswer={onAnswerQuestion}
              disabled={connectionStatus !== 'connected'}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// === Main Component ===
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

  const { sessions, updateSessionModel } = useSessions(projectId);

  // Model list from API
  const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);

  // Load models from API
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await modelsApi.listRecommended();
        if (response.models.length > 0) {
          setModels(response.models);
        }
      } catch (err) {
        console.error('Failed to load models, using fallback:', err);
      }
    };
    loadModels();
  }, []);

  // Find current session
  const currentSession = sessions.find(s => s.id === sessionId);
  const [currentModel, setCurrentModel] = useState(currentSession?.model || 'claude-sonnet-4-20250514');

  // Update model when session changes
  useEffect(() => {
    if (currentSession?.model) {
      setCurrentModel(currentSession.model);
    }
  }, [currentSession?.model]);

  // Handle model change
  const handleModelChange = useCallback(async (newModel: string) => {
    setCurrentModel(newModel);
    try {
      await updateSessionModel(sessionId, newModel);
    } catch (err) {
      console.error('Failed to update model:', err);
      // Revert to previous model on error
      if (currentSession?.model) {
        setCurrentModel(currentSession.model);
      }
    }
  }, [sessionId, updateSessionModel, currentSession?.model]);

  const [costLimit, setCostLimit] = useState<CostLimitState>({
    error: null,
    isChecking: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // スクロールハンドラ
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  }, []);

  // 自動スクロール
  useEffect(() => {
    if (shouldAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage, streamingContentBlocks, shouldAutoScroll]);

  // コスト制限チェック付きメッセージ送信
  const handleSendWithLimitCheck = useCallback(async (message: string) => {
    if (!projectId) {
      sendMessage(message);
      return;
    }

    setCostLimit({ error: null, isChecking: true });

    try {
      const limitCheck = await projectsApi.checkCostLimits(projectId);

      if (!limitCheck.can_use) {
        const exceededLabels = limitCheck.exceeded_limits.map(limit => {
          switch (limit) {
            case 'daily': return '1日';
            case 'weekly': return '7日';
            case 'monthly': return '30日';
            default: return limit;
          }
        }).join('、');

        setCostLimit({
          error: `利用制限（${exceededLabels}）を超過しています。料金設定から制限を変更してください。`,
          isChecking: false,
        });
        return;
      }

      sendMessage(message);
    } catch (error) {
      console.error('Failed to check cost limits:', error);
      sendMessage(message);
    } finally {
      setCostLimit(prev => ({ ...prev, isChecking: false }));
    }
  }, [projectId, sendMessage]);

  // エラー消去
  const dismissError = useCallback(() => {
    setCostLimit(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <ChatHeader
        isStreaming={isStreaming}
        connectionStatus={connectionStatus}
        currentModel={currentModel}
        onInterrupt={interrupt}
        onModelChange={handleModelChange}
        models={models}
      />

      {/* Messages Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 bg-bg-primary"
      >
        {isLoadingHistory && <LoadingIndicator />}

        <MessageList messages={messages} />

        <StreamingMessage
          streamingContentBlocks={streamingContentBlocks}
          toolExecutions={toolExecutions}
          isThinking={isThinking}
          isStreaming={isStreaming}
          pendingQuestion={pendingQuestion}
          connectionStatus={connectionStatus}
          onAnswerQuestion={answerQuestion}
        />
      </div>

      {/* Cost Limit Error */}
      {costLimit.error && (
        <CostLimitError error={costLimit.error} onDismiss={dismissError} />
      )}

      {/* Input */}
      <div className="border-t border-border bg-bg-primary">
        <MessageInput
          onSend={handleSendWithLimitCheck}
          disabled={isStreaming || costLimit.isChecking || connectionStatus !== 'connected'}
          projectId={projectId}
        />
      </div>
    </div>
  );
};

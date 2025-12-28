import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useWebSocket } from './useWebSocket';
import { sessionsApi, ApiChatMessage } from '@/lib/api';
import { Message, ContentBlock } from '@/types/message';

export interface UseChatOptions {
  sessionId: string;
}

// APIメッセージをフロントエンドのMessage形式に変換
const transformApiMessage = (apiMsg: ApiChatMessage): Message => {
  // contentがJSON形式の場合はパース、そうでなければテキストブロックとして扱う
  let contentBlocks: ContentBlock[];

  try {
    const parsed = JSON.parse(apiMsg.content);
    if (Array.isArray(parsed)) {
      contentBlocks = parsed;
    } else {
      contentBlocks = [{ type: 'text', text: apiMsg.content }];
    }
  } catch {
    // JSON解析失敗時はプレーンテキストとして扱う
    contentBlocks = [{ type: 'text', text: apiMsg.content }];
  }

  return {
    id: apiMsg.id,
    role: apiMsg.role,
    content: contentBlocks,
    timestamp: apiMsg.created_at,
  };
};

export const useChat = ({ sessionId }: UseChatOptions) => {
  const {
    messages,
    isStreaming,
    isThinking,
    isLoadingHistory,
    currentStreamingMessage,
    toolExecutions,
    clearMessages,
    loadMessages,
    setLoadingHistory,
  } = useChatStore();

  const { sendMessage, interrupt, connectionStatus, reconnect } = useWebSocket(sessionId);

  // 前回のsessionIdを追跡
  const prevSessionIdRef = useRef<string | null>(null);

  // セッション変更時にメッセージ履歴を読み込む
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId) return;

      // セッションが変更された場合のみ履歴を読み込む
      if (prevSessionIdRef.current === sessionId) return;
      prevSessionIdRef.current = sessionId;

      setLoadingHistory(true);
      clearMessages();

      try {
        const response = await sessionsApi.getMessages(sessionId);
        if (response.messages && response.messages.length > 0) {
          const transformedMessages = response.messages.map(transformApiMessage);
          loadMessages(transformedMessages);
        }
      } catch (error) {
        console.error('Failed to load message history:', error);
        // エラー時は空のメッセージリストで続行
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [sessionId, clearMessages, loadMessages, setLoadingHistory]);

  const handleSend = useCallback(
    (content: string, files?: any[]) => {
      if (!content.trim()) return;
      sendMessage(content, files);
    },
    [sendMessage]
  );

  const handleInterrupt = useCallback(() => {
    interrupt();
  }, [interrupt]);

  const handleClearMessages = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  return {
    // Messages
    messages,
    currentStreamingMessage,
    toolExecutions: Object.values(toolExecutions),

    // Status
    isStreaming,
    isThinking,
    isLoadingHistory,
    connectionStatus,
    isConnected: connectionStatus === 'connected',

    // Actions
    sendMessage: handleSend,
    interrupt: handleInterrupt,
    clearMessages: handleClearMessages,
    reconnect,
  };
};

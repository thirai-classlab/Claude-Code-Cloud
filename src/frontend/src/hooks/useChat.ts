import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useWebSocket } from './useWebSocket';
import { sessionsApi, ApiChatMessage } from '@/lib/api';
import { Message, ContentBlock } from '@/types/message';

export interface UseChatOptions {
  sessionId: string;
}

// 履歴読み込みのエラータイプ
export interface HistoryLoadError {
  type: 'network' | 'server' | 'unknown';
  message: string;
  retryable: boolean;
}

// 設定
const CONFIG = {
  MAX_RETRIES: 3,
} as const;

// ContentBlockの妥当性をチェック
const isValidContentBlock = (block: unknown): block is ContentBlock => {
  if (!block || typeof block !== 'object') return false;
  const b = block as Record<string, unknown>;

  switch (b.type) {
    case 'text':
      return typeof b.text === 'string';
    case 'thinking':
      return typeof b.content === 'string';
    case 'tool_use':
      return typeof b.id === 'string' && typeof b.name === 'string';
    case 'tool_result':
      return typeof b.tool_use_id === 'string';
    default:
      return false;
  }
};

// JSONコンテンツをパース
const parseJsonContent = (content: string): ContentBlock[] => {
  try {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      const validBlocks = parsed.filter(isValidContentBlock);
      return validBlocks.length > 0 ? validBlocks : [{ type: 'text', text: content }];
    }

    if (isValidContentBlock(parsed)) {
      return [parsed];
    }

    return [{ type: 'text', text: content }];
  } catch {
    return [{ type: 'text', text: content }];
  }
};

// APIメッセージをフロントエンドのMessage形式に変換
const transformApiMessage = (apiMsg: ApiChatMessage): Message => {
  let contentBlocks: ContentBlock[];

  if (!apiMsg.content || apiMsg.content.trim() === '') {
    contentBlocks = [{ type: 'text', text: '' }];
  } else if (apiMsg.content.startsWith('[') || apiMsg.content.startsWith('{')) {
    contentBlocks = parseJsonContent(apiMsg.content);
  } else {
    contentBlocks = [{ type: 'text', text: apiMsg.content }];
  }

  return {
    id: apiMsg.id,
    role: apiMsg.role,
    content: contentBlocks,
    timestamp: apiMsg.created_at,
  };
};

// エラーを分類
const classifyError = (error: unknown): HistoryLoadError => {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'ネットワーク接続を確認してください',
      retryable: true,
    };
  }

  const status = (error as { status?: number })?.status;
  if (status) {
    if (status >= 500) {
      return {
        type: 'server',
        message: 'サーバーエラーが発生しました',
        retryable: true,
      };
    }
    return {
      type: 'server',
      message: `エラーが発生しました (${status})`,
      retryable: status !== 404,
    };
  }

  return {
    type: 'unknown',
    message: '履歴の読み込みに失敗しました',
    retryable: true,
  };
};

export const useChat = ({ sessionId }: UseChatOptions) => {
  // Store state
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const isThinking = useChatStore((state) => state.isThinking);
  const isLoadingHistory = useChatStore((state) => state.isLoadingHistory);
  const currentStreamingMessage = useChatStore((state) => state.currentStreamingMessage);
  const toolExecutions = useChatStore((state) => state.toolExecutions);
  const pendingQuestion = useChatStore((state) => state.pendingQuestion);

  // Store actions
  const getStreamingContentBlocks = useChatStore((state) => state.getStreamingContentBlocks);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const setLoadingHistory = useChatStore((state) => state.setLoadingHistory);
  const setCurrentSessionId = useChatStore((state) => state.setCurrentSessionId);
  const cacheMessages = useChatStore((state) => state.cacheMessages);
  const getCachedMessages = useChatStore((state) => state.getCachedMessages);
  const isCacheValid = useChatStore((state) => state.isCacheValid);
  const getDraftMessage = useChatStore((state) => state.getDraftMessage);
  const setDraftMessage = useChatStore((state) => state.setDraftMessage);
  const clearDraftMessage = useChatStore((state) => state.clearDraftMessage);
  const savePartialStreamingMessage = useChatStore((state) => state.savePartialStreamingMessage);

  // WebSocket
  const {
    sendMessage,
    interrupt,
    requestResume,
    answerQuestion,
    connectionStatus,
    reconnect,
  } = useWebSocket(sessionId);

  // Local state
  const [historyError, setHistoryError] = useState<HistoryLoadError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [shouldResume, setShouldResume] = useState(false);

  // Refs
  const prevSessionIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // セッション変更時にメッセージ履歴を読み込む
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId) return;
      if (isLoadingRef.current) return;
      if (prevSessionIdRef.current === sessionId) return;

      prevSessionIdRef.current = sessionId;
      setCurrentSessionId(sessionId);
      setHistoryError(null);
      setShouldResume(false);

      // セッション情報を取得して処理中かどうかをチェック
      try {
        const session = await sessionsApi.get(sessionId);
        if (session.is_processing) {
          console.log('[useChat] Session is processing, will request resume');
          setShouldResume(true);
        }
      } catch (error) {
        console.warn('Failed to check session state:', error);
      }

      // キャッシュが有効な場合はキャッシュから読み込む
      if (isCacheValid(sessionId)) {
        const cached = getCachedMessages(sessionId);
        if (cached) {
          loadMessages(cached.messages);
          return;
        }
      }

      isLoadingRef.current = true;
      setLoadingHistory(true);
      clearMessages();

      try {
        const response = await sessionsApi.getMessages(sessionId);
        if (response.messages?.length > 0) {
          const transformedMessages = response.messages.map(transformApiMessage);
          loadMessages(transformedMessages);
          cacheMessages(sessionId, transformedMessages);
        }
        setRetryCount(0);
      } catch (error) {
        console.error('Failed to load message history:', error);
        const classifiedError = classifyError(error);
        setHistoryError(classifiedError);

        // キャッシュがある場合はフォールバック
        const cached = getCachedMessages(sessionId);
        if (cached) {
          loadMessages(cached.messages);
          console.log('Loaded from cache due to error');
        }
      } finally {
        setLoadingHistory(false);
        isLoadingRef.current = false;
      }
    };

    loadHistory();
  }, [
    sessionId,
    clearMessages,
    loadMessages,
    setLoadingHistory,
    setCurrentSessionId,
    cacheMessages,
    getCachedMessages,
    isCacheValid,
  ]);

  // WebSocket接続後に処理中セッションの再開をリクエスト
  useEffect(() => {
    if (shouldResume && connectionStatus === 'connected') {
      console.log('[useChat] Connection established, requesting resume');
      requestResume();
      setShouldResume(false);
    }
  }, [shouldResume, connectionStatus, requestResume]);

  // ページ離脱時の状態保存
  useEffect(() => {
    const handleUnload = () => {
      if (isStreaming && sessionId) {
        savePartialStreamingMessage(sessionId);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isStreaming && sessionId) {
        savePartialStreamingMessage(sessionId);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isStreaming, sessionId, savePartialStreamingMessage]);

  // 履歴再読み込み
  const retryLoadHistory = useCallback(() => {
    if (!sessionId || retryCount >= CONFIG.MAX_RETRIES) return;

    setRetryCount((prev) => prev + 1);
    prevSessionIdRef.current = null;
    setHistoryError(null);
  }, [sessionId, retryCount]);

  // メッセージ送信
  const handleSend = useCallback(
    (content: string, files?: unknown[]) => {
      if (!content.trim()) return;
      if (sessionId) {
        clearDraftMessage(sessionId);
      }
      sendMessage(content, files);
    },
    [sendMessage, sessionId, clearDraftMessage]
  );

  // ドラフト保存
  const saveDraft = useCallback(
    (content: string) => {
      if (sessionId) {
        setDraftMessage(sessionId, content);
      }
    },
    [sessionId, setDraftMessage]
  );

  // ドラフト取得
  const getDraft = useCallback(() => {
    if (!sessionId) return '';
    return getDraftMessage(sessionId);
  }, [sessionId, getDraftMessage]);

  return {
    // Messages
    messages,
    currentStreamingMessage,
    toolExecutions: Object.values(toolExecutions),
    streamingContentBlocks: getStreamingContentBlocks(),

    // Status
    isStreaming,
    isThinking,
    isLoadingHistory,
    connectionStatus,
    isConnected: connectionStatus === 'connected',

    // Error handling
    historyError,
    retryLoadHistory,
    canRetry: historyError?.retryable && retryCount < CONFIG.MAX_RETRIES,

    // Draft
    saveDraft,
    getDraft,

    // Actions
    sendMessage: handleSend,
    interrupt,
    clearMessages,
    reconnect,
    requestResume,
    answerQuestion,

    // AskUserQuestion
    pendingQuestion,
  };
};

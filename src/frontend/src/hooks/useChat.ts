import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useWebSocket } from './useWebSocket';
import { sessionsApi, ApiChatMessage } from '@/lib/api';
import { Message, ContentBlock } from '@/types/message';

export interface UseChatOptions {
  sessionId: string;
}

// 履歴読み込みのエラータイプ
export type HistoryLoadError = {
  type: 'network' | 'server' | 'unknown';
  message: string;
  retryable: boolean;
};

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

// エラーを分類
const classifyError = (error: unknown): HistoryLoadError => {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'ネットワーク接続を確認してください',
      retryable: true,
    };
  }

  if (error instanceof Response || (error as any)?.status) {
    const status = (error as any).status;
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
  const {
    messages,
    isStreaming,
    isThinking,
    isLoadingHistory,
    currentStreamingMessage,
    toolExecutions,
    getStreamingContentBlocks,
    clearMessages,
    loadMessages,
    setLoadingHistory,
    // キャッシュ関連
    setCurrentSessionId,
    cacheMessages,
    getCachedMessages,
    isCacheValid,
    // ドラフト関連
    getDraftMessage,
    setDraftMessage,
    clearDraftMessage,
    // ストリーミング中断
    savePartialStreamingMessage,
  } = useChatStore();

  const { sendMessage, interrupt, connectionStatus, reconnect } = useWebSocket(sessionId);

  // 状態
  const [historyError, setHistoryError] = useState<HistoryLoadError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // 前回のsessionIdを追跡
  const prevSessionIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // セッション変更時にメッセージ履歴を読み込む
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId) return;

      // 既に読み込み中の場合はスキップ
      if (isLoadingRef.current) return;

      // セッションが変更された場合のみ履歴を読み込む
      if (prevSessionIdRef.current === sessionId) return;
      prevSessionIdRef.current = sessionId;

      // 現在のセッションIDを設定
      setCurrentSessionId(sessionId);
      setHistoryError(null);

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
        if (response.messages && response.messages.length > 0) {
          const transformedMessages = response.messages.map(transformApiMessage);
          loadMessages(transformedMessages);
          // キャッシュに保存
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

  // ページ離脱時の状態保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      // ストリーミング中の場合は部分メッセージを保存
      if (isStreaming && sessionId) {
        savePartialStreamingMessage(sessionId);
      }
    };

    // visibilitychangeでも保存（モバイル対応）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isStreaming && sessionId) {
        savePartialStreamingMessage(sessionId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isStreaming, sessionId, savePartialStreamingMessage]);

  // セッション変更時にドラフトを保存
  useEffect(() => {
    return () => {
      // クリーンアップ時に現在のドラフトを保存する処理は
      // ChatInputコンポーネントで行う
    };
  }, [sessionId]);

  // 履歴再読み込み
  const retryLoadHistory = useCallback(async () => {
    if (!sessionId || retryCount >= MAX_RETRIES) return;

    setRetryCount((prev) => prev + 1);
    prevSessionIdRef.current = null; // リセットして再読み込みをトリガー
    setHistoryError(null);
  }, [sessionId, retryCount]);

  const handleSend = useCallback(
    (content: string, files?: any[]) => {
      if (!content.trim()) return;
      // 送信時にドラフトをクリア
      if (sessionId) {
        clearDraftMessage(sessionId);
      }
      sendMessage(content, files);
    },
    [sendMessage, sessionId, clearDraftMessage]
  );

  const handleInterrupt = useCallback(() => {
    interrupt();
  }, [interrupt]);

  const handleClearMessages = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  // ドラフトメッセージの保存
  const saveDraft = useCallback(
    (content: string) => {
      if (sessionId) {
        setDraftMessage(sessionId, content);
      }
    },
    [sessionId, setDraftMessage]
  );

  // ドラフトメッセージの取得
  const getDraft = useCallback(() => {
    if (!sessionId) return '';
    return getDraftMessage(sessionId);
  }, [sessionId, getDraftMessage]);

  return {
    // Messages
    messages,
    currentStreamingMessage,
    toolExecutions: Object.values(toolExecutions),
    // ストリーミング中のコンテンツブロック（時系列順）
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
    canRetry: historyError?.retryable && retryCount < MAX_RETRIES,

    // Draft
    saveDraft,
    getDraft,

    // Actions
    sendMessage: handleSend,
    interrupt: handleInterrupt,
    clearMessages: handleClearMessages,
    reconnect,
  };
};

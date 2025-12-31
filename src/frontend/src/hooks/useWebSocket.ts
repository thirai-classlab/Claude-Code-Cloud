import { useEffect, useRef, useCallback, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useSessionStore } from '@/stores/sessionStore';
import {
  WSClientMessage,
  WSServerMessage,
  ConnectionStatus,
  WSQuestionAnswerMessage
} from '@/types/websocket';

// WebSocket設定
const WS_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  BASE_RECONNECT_DELAY: 1000,
  MAX_RECONNECT_DELAY: 30000,
} as const;

// WebSocket URLを構築
const buildWsUrl = (sessionId: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
  return `${baseUrl}/ws/chat/${sessionId}`;
};

// 指数バックオフで再接続遅延を計算
const calculateReconnectDelay = (attempts: number): number => {
  const delay = WS_CONFIG.BASE_RECONNECT_DELAY * Math.pow(2, attempts);
  return Math.min(delay, WS_CONFIG.MAX_RECONNECT_DELAY);
};

export const useWebSocket = (sessionId: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const sessionNotFoundRef = useRef(false);
  const prevSessionIdRef = useRef<string | null>(null);

  // Store actions
  const {
    addMessage,
    finalizeStreamingMessage,
    appendTextToStream,
    appendToolUseToStream,
    appendToolResultToStream,
    startToolExecution,
    updateToolExecution,
    setStreaming,
    setThinking,
    setPendingQuestion,
    clearPendingQuestion,
  } = useChatStore();

  // サーバーメッセージを処理
  const handleServerMessage = useCallback((message: WSServerMessage) => {
    switch (message.type) {
      case 'thinking':
        setThinking(true);
        break;

      case 'text':
        appendTextToStream(message.content);
        break;

      case 'tool_use_start':
        appendToolUseToStream({
          type: 'tool_use',
          id: message.tool_use_id,
          name: message.tool,
          input: message.input || {},
        });
        startToolExecution({
          tool_use_id: message.tool_use_id,
          name: message.tool,
          input: message.input || {},
        });
        break;

      case 'tool_executing':
        updateToolExecution(message.tool_use_id, {
          status: 'executing',
          input: message.input,
        });
        break;

      case 'tool_result':
        appendToolResultToStream({
          type: 'tool_result',
          tool_use_id: message.tool_use_id,
          content: message.output || '',
          is_error: !message.success,
        });
        updateToolExecution(message.tool_use_id, {
          status: message.success ? 'success' : 'error',
          output: message.output,
          endTime: Date.now(),
        });
        break;

      case 'result':
        finalizeStreamingMessage();
        setStreaming(false);
        setThinking(false);
        console.log('[Result]', { usage: message.usage, cost: message.cost });
        break;

      case 'error': {
        setStreaming(false);
        setThinking(false);
        const errorMsg = message.message || message.error || 'Unknown error';
        console.error('[Error]', errorMsg, message.code);

        if (errorMsg.includes('not found') || errorMsg.includes('Session')) {
          sessionNotFoundRef.current = true;
          useSessionStore.getState().setCurrentSession(null);
          return;
        }

        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: [{ type: 'text', text: `Error: ${errorMsg}` }],
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'interrupted':
        setStreaming(false);
        setThinking(false);
        console.log('[Interrupted]', message.message);
        break;

      case 'resume_started':
        console.log('[Resume Started]', message);
        setStreaming(true);
        setThinking(true);
        break;

      case 'resume_not_needed':
        console.log('[Resume Not Needed]', message);
        setStreaming(false);
        setThinking(false);
        break;

      case 'resume_failed':
        console.warn('[Resume Failed]', message);
        setStreaming(false);
        setThinking(false);
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: [{ type: 'text', text: `Stream resume failed: ${message.error}` }],
          timestamp: new Date().toISOString(),
        });
        break;

      case 'user_question':
        console.log('[User Question]', message);
        setPendingQuestion({
          toolUseId: message.tool_use_id,
          questions: message.questions,
        });
        break;

      default:
        console.warn('[Unknown message type]', message);
    }
  }, [
    addMessage,
    appendTextToStream,
    appendToolResultToStream,
    appendToolUseToStream,
    finalizeStreamingMessage,
    setStreaming,
    setThinking,
    setPendingQuestion,
    startToolExecution,
    updateToolExecution,
  ]);

  // メッセージ送信
  const sendMessage = useCallback((content: string, files?: unknown[]) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send - not connected');
      return;
    }

    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: content }],
      timestamp: new Date().toISOString(),
    });

    const message: WSClientMessage = {
      type: 'chat',
      content,
      files: files as Array<{ path: string; content: string }>,
    };
    wsRef.current.send(JSON.stringify(message));
    setStreaming(true);
  }, [setStreaming, addMessage]);

  // 処理中断
  const interrupt = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
  }, []);

  // ストリーム再開リクエスト
  const requestResume = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Requesting stream resume');
      wsRef.current.send(JSON.stringify({ type: 'resume' }));
      setStreaming(true);
      setThinking(true);
    }
  }, [setStreaming, setThinking]);

  // 質問への回答送信
  const answerQuestion = useCallback((toolUseId: string, answers: Record<string, string>) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket] Cannot send answer - not connected');
      return;
    }

    console.log('[WebSocket] Sending question answer', { toolUseId, answers });
    const message: WSQuestionAnswerMessage = {
      type: 'question_answer',
      tool_use_id: toolUseId,
      answers,
    };
    wsRef.current.send(JSON.stringify(message));
    clearPendingQuestion();
  }, [clearPendingQuestion]);

  // WebSocket接続
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (sessionNotFoundRef.current) return;

    setConnectionStatus('connecting');

    const ws = new WebSocket(buildWsUrl(sessionId));

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WSServerMessage = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (error) {
        console.error('[WebSocket] Parse error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setConnectionStatus('disconnected');

      if (sessionNotFoundRef.current) {
        console.log('[WebSocket] Session not found, not reconnecting');
        return;
      }

      if (reconnectAttemptsRef.current < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
        const delay = calculateReconnectDelay(reconnectAttemptsRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    wsRef.current = ws;
  }, [sessionId, handleServerMessage]);

  // セッション変更時の接続管理
  useEffect(() => {
    if (prevSessionIdRef.current !== sessionId) {
      sessionNotFoundRef.current = false;
      reconnectAttemptsRef.current = 0;
      prevSessionIdRef.current = sessionId;
    }

    if (sessionNotFoundRef.current) return;

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, connect]);

  return {
    sendMessage,
    interrupt,
    requestResume,
    answerQuestion,
    connectionStatus,
    reconnect: connect,
  };
};

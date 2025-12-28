import { useEffect, useRef, useCallback, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useSessionStore } from '@/stores/sessionStore';
import { WSClientMessage, WSServerMessage, ConnectionStatus } from '@/types/websocket';

export const useWebSocket = (sessionId: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const sessionNotFoundRef = useRef(false);

  const {
    addMessage,
    updateStreamingMessage,
    finalizeStreamingMessage,
    startToolExecution,
    updateToolExecution,
    setStreaming,
    setThinking,
  } = useChatStore();

  const sendMessage = useCallback((content: string, files?: any[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // ユーザーメッセージをストアに追加
      addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: content }],
        timestamp: new Date().toISOString(),
      });

      const message: WSClientMessage = {
        type: 'chat',
        content,
        files,
      };
      wsRef.current.send(JSON.stringify(message));
      setStreaming(true);
    }
  }, [setStreaming, addMessage]);

  const interrupt = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
  }, []);

  const handleServerMessage = useCallback((message: WSServerMessage) => {
    switch (message.type) {
      case 'thinking':
        setThinking(true);
        break;

      case 'text':
        // ストリーミングテキストを蓄積
        updateStreamingMessage(message.content);
        break;

      case 'tool_use_start':
        // ツール実行開始
        startToolExecution({
          tool_use_id: message.tool_use_id,
          name: message.tool,
          input: message.input || {},
        });
        break;

      case 'tool_executing':
        // ツール実行中状態に更新
        updateToolExecution(message.tool_use_id, {
          status: 'executing',
          input: message.input,
        });
        break;

      case 'tool_result':
        // ツール実行結果
        updateToolExecution(message.tool_use_id, {
          status: message.success ? 'success' : 'error',
          output: message.output,
          endTime: Date.now(),
        });
        break;

      case 'result':
        // メッセージ完了
        finalizeStreamingMessage();
        setStreaming(false);
        setThinking(false);
        console.log('[Result]', {
          usage: message.usage,
          cost: message.cost,
        });
        break;

      case 'error':
        setStreaming(false);
        setThinking(false);
        const errorMsg = message.message || message.error || 'Unknown error';
        console.error('[Error]', errorMsg, message.code);

        // セッションが見つからない場合は再接続を停止し、セッションをクリア
        if (errorMsg.includes('not found') || errorMsg.includes('Session')) {
          sessionNotFoundRef.current = true;
          useSessionStore.getState().setCurrentSession(null);
          return;
        }

        // エラーメッセージを表示
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: [{ type: 'text', text: `Error: ${errorMsg}` }],
          timestamp: new Date().toISOString(),
        });
        break;

      case 'interrupted':
        setStreaming(false);
        setThinking(false);
        console.log('[Interrupted]', message.message);
        break;

      default:
        console.warn('[Unknown message type]', message);
    }
  }, [
    updateStreamingMessage,
    finalizeStreamingMessage,
    startToolExecution,
    updateToolExecution,
    setStreaming,
    setThinking,
    addMessage,
  ]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (sessionNotFoundRef.current) return;

    setConnectionStatus('connecting');

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/chat/${sessionId}`;
    const ws = new WebSocket(wsUrl);

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

      // セッションが見つからない場合は再接続しない
      if (sessionNotFoundRef.current) {
        console.log('[WebSocket] Session not found, not reconnecting');
        return;
      }

      if (reconnectAttemptsRef.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    wsRef.current = ws;
  }, [sessionId, handleServerMessage]);

  // sessionIdが変わった時だけリセット
  const prevSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 新しいセッションIDの場合のみリセット
    if (prevSessionIdRef.current !== sessionId) {
      sessionNotFoundRef.current = false;
      reconnectAttemptsRef.current = 0;
      prevSessionIdRef.current = sessionId;
    }

    // セッションが見つからない場合は接続しない
    if (sessionNotFoundRef.current) {
      return;
    }

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
    connectionStatus,
    reconnect: connect,
  };
};

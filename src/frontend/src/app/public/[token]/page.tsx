'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getPublicProjectInfo,
  verifyPublicPassword,
  getPublicCommands,
  createPublicSession,
  PublicProjectInfo,
  PublicCommand,
} from '@/lib/api/publicAccess';

interface Props {
  params: {
    token: string;
  };
}

type Stage = 'loading' | 'error' | 'password' | 'commands' | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function PublicPage({ params }: Props) {
  const { token } = params;

  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState<string | null>(null);
  const [projectInfo, setProjectInfo] = useState<PublicProjectInfo | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [commands, setCommands] = useState<PublicCommand[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<PublicCommand | null>(null);
  // sessionId is stored for potential future use (session reconnection, etc.)
  const [, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初期読み込み
  useEffect(() => {
    async function load() {
      try {
        const info = await getPublicProjectInfo(token);
        setProjectInfo(info);

        if (!info.is_accessible) {
          setError(info.error || 'Access denied');
          setStage('error');
          return;
        }

        if (info.requires_password) {
          setStage('password');
        } else {
          // パスワード不要の場合、直接コマンド一覧を取得
          try {
            const cmds = await getPublicCommands(token);
            setCommands(cmds.commands);
            setStage('commands');
          } catch (cmdErr: any) {
            setError(cmdErr.message || 'Failed to load commands');
            setStage('error');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load');
        setStage('error');
      }
    }
    load();
  }, [token]);

  const loadCommands = useCallback(async (sToken?: string) => {
    try {
      const cmds = await getPublicCommands(token, sToken || sessionToken || undefined);
      setCommands(cmds.commands);
      setStage('commands');
    } catch (err: any) {
      setError(err.message || 'Failed to load commands');
      setStage('error');
    }
  }, [token, sessionToken]);

  const handleVerifyPassword = async () => {
    setVerifying(true);
    setError(null);

    try {
      const result = await verifyPublicPassword(token, password);
      if (result.verified && result.session_token) {
        setSessionToken(result.session_token);
        await loadCommands(result.session_token);
      } else {
        setError(result.error || 'Invalid password');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSelectCommand = async (cmd: PublicCommand) => {
    try {
      const session = await createPublicSession(token, cmd.id, sessionToken || undefined);
      setSelectedCommand(cmd);
      setSessionId(session.session_id);
      setRemainingMessages(session.limits.remaining_messages);
      setStage('chat');

      // WebSocket接続
      connectWebSocket(session.session_id);
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    }
  };

  const connectWebSocket = (sessId: string) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/ws/public/${token}/${sessId}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'text') {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, content: last.content + data.content }];
          }
          return [...prev, { role: 'assistant', content: data.content }];
        });
      } else if (data.type === 'result') {
        setSending(false);
        if (data.remaining_messages !== null && data.remaining_messages !== undefined) {
          setRemainingMessages(data.remaining_messages);
        }
      } else if (data.type === 'error') {
        setError(data.error);
        setSending(false);
      } else if (data.type === 'thinking') {
        // Thinking状態
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
      setError('Connection error');
    };

    wsRef.current = ws;
  };

  const sendMessage = () => {
    if (!input.trim() || sending || !wsRef.current) return;

    const message = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setInput('');
    setSending(true);

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      content: message,
    }));
  };

  // スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Loading
  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  // Error
  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">Access Denied</div>
          <div className="text-zinc-500">{error}</div>
        </div>
      </div>
    );
  }

  // Password
  if (stage === 'password') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="max-w-sm w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-zinc-100">{projectInfo?.project_name}</h1>
            {projectInfo?.description && (
              <p className="text-zinc-500 mt-2">{projectInfo.description}</p>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Enter Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
              placeholder="Password"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-300 mb-4"
            />
            {error && (
              <div className="text-red-400 text-sm mb-4">{error}</div>
            )}
            <button
              onClick={handleVerifyPassword}
              disabled={verifying || !password}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 rounded text-white"
            >
              {verifying ? 'Verifying...' : 'Access'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Commands
  if (stage === 'commands') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="max-w-lg w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-zinc-100">{projectInfo?.project_name}</h1>
            {projectInfo?.description && (
              <p className="text-zinc-500 mt-2">{projectInfo.description}</p>
            )}
          </div>

          <div className="text-center text-zinc-400 mb-4">Select a service</div>

          <div className="space-y-3">
            {commands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => handleSelectCommand(cmd)}
                className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors text-left"
              >
                <div className="font-medium text-zinc-200">{cmd.name}</div>
                {cmd.description && (
                  <div className="text-sm text-zinc-500 mt-1">{cmd.description}</div>
                )}
              </button>
            ))}
          </div>

          {error && (
            <div className="text-red-400 text-sm mt-4 text-center">{error}</div>
          )}
        </div>
      </div>
    );
  }

  // Chat
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <span className="text-zinc-400 text-sm">{projectInfo?.project_name}</span>
          <span className="text-zinc-600 mx-2">/</span>
          <span className="text-zinc-200">{selectedCommand?.name}</span>
        </div>
        {remainingMessages !== null && (
          <div className="text-zinc-500 text-sm">
            Remaining: {remainingMessages}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-200'
              }`}
            >
              {msg.content || (sending && msg.role === 'assistant' ? (
                <span className="text-zinc-500">Thinking...</span>
              ) : null)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-4">
        {error && (
          <div className="text-red-400 text-sm mb-2">{error}</div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            disabled={sending || remainingMessages === 0}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-zinc-300 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim() || remainingMessages === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 rounded text-white"
          >
            Send
          </button>
        </div>
        {remainingMessages === 0 && (
          <div className="text-zinc-500 text-sm mt-2">Message limit reached</div>
        )}
      </div>
    </div>
  );
}

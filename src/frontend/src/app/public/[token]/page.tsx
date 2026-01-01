'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

type Stage = 'loading' | 'error' | 'password' | 'welcome' | 'commands' | 'chat';

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
  const [sessionMode, setSessionMode] = useState<'command' | 'free_chat'>('free_chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // コマンド数に応じてフローを決定
  const decideNextStageForCommands = useCallback((cmds: PublicCommand[]) => {
    if (cmds.length === 0) {
      // コマンドなし → ウェルカム画面からフリーチャット
      setStage('welcome');
    } else if (cmds.length === 1) {
      // コマンド1つ → ウェルカム画面から自動選択
      setStage('welcome');
    } else {
      // コマンド2つ以上 → 選択画面
      setStage('commands');
    }
  }, []);

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
          // パスワード不要の場合、コマンド一覧を取得してフローを決定
          try {
            const cmds = await getPublicCommands(token);
            setCommands(cmds.commands);
            decideNextStageForCommands(cmds.commands);
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
  }, [token, decideNextStageForCommands]);

  const loadCommandsAndDecide = useCallback(async (sToken?: string) => {
    try {
      const cmds = await getPublicCommands(token, sToken || sessionToken || undefined);
      setCommands(cmds.commands);
      decideNextStageForCommands(cmds.commands);
    } catch (err: any) {
      setError(err.message || 'Failed to load commands');
      setStage('error');
    }
  }, [token, sessionToken, decideNextStageForCommands]);

  const handleVerifyPassword = async () => {
    setVerifying(true);
    setError(null);

    try {
      const result = await verifyPublicPassword(token, password);
      if (result.verified && result.session_token) {
        setSessionToken(result.session_token);
        await loadCommandsAndDecide(result.session_token);
      } else {
        setError(result.error || 'Invalid password');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // チャット開始（コマンド選択またはフリーチャット）
  const startChat = async (cmd?: PublicCommand) => {
    try {
      const session = await createPublicSession(
        token,
        cmd?.id || null,
        sessionToken || undefined
      );
      setSelectedCommand(cmd || null);
      setSessionId(session.session_id);
      setSessionMode(session.mode);
      setRemainingMessages(session.limits.remaining_messages);
      setStage('chat');

      // WebSocket接続
      connectWebSocket(session.session_id);
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    }
  };

  const handleSelectCommand = async (cmd: PublicCommand) => {
    await startChat(cmd);
  };

  const handleStartFreeChat = async () => {
    if (commands.length === 1) {
      // コマンドが1つの場合は自動選択
      await startChat(commands[0]);
    } else {
      // フリーチャット
      await startChat();
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

    // フォーカスを維持
    inputRef.current?.focus();
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

  // Enterキーで送信（Shift+Enterで改行）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Loading
  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-zinc-400 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Error
  if (stage === 'error') {
    const isIpError = error?.includes('IP address') || error?.includes('IP');
    const isExpiredError = error?.includes('expired');
    const isDisabledError = error?.includes('disabled');
    const isLimitError = error?.includes('limit');

    let errorIcon = (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
    let errorTitle = 'Access Denied';
    let errorDescription = error;

    if (isIpError) {
      errorIcon = (
        <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      errorTitle = 'アクセス制限';
      errorDescription = 'このIPアドレスからのアクセスは許可されていません。管理者にお問い合わせください。';
    } else if (isExpiredError) {
      errorIcon = (
        <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      errorTitle = '公開期限切れ';
      errorDescription = 'この共有リンクは期限切れです。';
    } else if (isDisabledError) {
      errorIcon = (
        <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      );
      errorTitle = '共有停止中';
      errorDescription = 'この共有リンクは現在無効になっています。';
    } else if (isLimitError) {
      errorIcon = (
        <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      errorTitle = '利用上限';
      errorDescription = '本日のセッション上限に達しました。明日以降にお試しください。';
    }

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
            isIpError || isLimitError ? 'bg-amber-500/10' : isExpiredError || isDisabledError ? 'bg-zinc-500/10' : 'bg-red-500/10'
          }`}>
            {errorIcon}
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">{errorTitle}</h1>
          <p className="text-zinc-400">{errorDescription}</p>
        </div>
      </div>
    );
  }

  // Password
  if (stage === 'password') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          {/* Project Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {projectInfo?.project_name?.charAt(0).toUpperCase() || 'P'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">{projectInfo?.project_name}</h1>
            {projectInfo?.description && (
              <p className="text-zinc-400 mt-2 text-sm">{projectInfo.description}</p>
            )}
          </div>

          {/* Password Form */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-zinc-300 font-medium">Password Required</span>
            </div>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
              placeholder="Enter password"
              autoFocus
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />

            {error && (
              <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleVerifyPassword}
              disabled={verifying || !password}
              className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
            >
              {verifying ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Welcome (新ステージ: コマンド0-1個時)
  if (stage === 'welcome') {
    const singleCommand = commands.length === 1 ? commands[0] : null;

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          {/* Project Header */}
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-3xl font-bold text-white">
                {projectInfo?.project_name?.charAt(0).toUpperCase() || 'P'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-3">{projectInfo?.project_name}</h1>
            {projectInfo?.description && (
              <p className="text-zinc-400 text-lg leading-relaxed">{projectInfo.description}</p>
            )}
          </div>

          {/* Service Info */}
          {singleCommand && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-6 text-left">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200">{singleCommand.name}</h3>
                  {singleCommand.description && (
                    <p className="text-zinc-400 text-sm mt-1">{singleCommand.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStartFreeChat}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-medium text-lg transition-all hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Start Chat
          </button>

          {/* Footer */}
          <p className="text-zinc-500 text-sm mt-6">
            Powered by Claude AI
          </p>
        </div>
      </div>
    );
  }

  // Commands (コマンド2つ以上時の選択画面)
  if (stage === 'commands') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {/* Project Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {projectInfo?.project_name?.charAt(0).toUpperCase() || 'P'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">{projectInfo?.project_name}</h1>
            {projectInfo?.description && (
              <p className="text-zinc-400 mt-2">{projectInfo.description}</p>
            )}
          </div>

          {/* Command List */}
          <div className="mb-4">
            <p className="text-zinc-400 text-sm text-center mb-4">Select a service to get started</p>
          </div>

          <div className="space-y-3">
            {commands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => handleSelectCommand(cmd)}
                className="w-full p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:bg-zinc-900 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 group-hover:bg-indigo-500/10 flex items-center justify-center flex-shrink-0 transition-colors">
                    <svg className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-zinc-200 group-hover:text-white transition-colors">
                      {cmd.name}
                    </div>
                    {cmd.description && (
                      <div className="text-sm text-zinc-500 mt-1">{cmd.description}</div>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {projectInfo?.project_name?.charAt(0).toUpperCase() || 'P'}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-200">{projectInfo?.project_name}</div>
              {selectedCommand && (
                <div className="text-xs text-zinc-500">{selectedCommand.name}</div>
              )}
              {!selectedCommand && sessionMode === 'free_chat' && (
                <div className="text-xs text-zinc-500">Free Chat</div>
              )}
            </div>
          </div>
          {remainingMessages !== null && (
            <div className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">
              {remainingMessages} messages left
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-zinc-300 mb-2">Start a conversation</h2>
              <p className="text-zinc-500 text-sm">
                {selectedCommand
                  ? `Ask me anything about ${selectedCommand.name}`
                  : 'Type a message to begin'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[75%] ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3'
                        : 'bg-zinc-800/50 text-zinc-200 rounded-2xl rounded-bl-md px-4 py-3'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      msg.content ? (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700 prose-code:text-indigo-300">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-zinc-500 text-sm">Thinking...</span>
                        </div>
                      )
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {error && (
            <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {remainingMessages === 0 ? (
            <div className="text-center py-3 text-zinc-500">
              <p className="mb-1">You&apos;ve reached the message limit</p>
              <p className="text-sm">Thank you for using this service</p>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={sending}
                  rows={1}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none disabled:opacity-50"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl text-white transition-colors flex items-center gap-2"
              >
                {sending ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          )}

          <p className="text-center text-zinc-600 text-xs mt-3">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </footer>
    </div>
  );
}

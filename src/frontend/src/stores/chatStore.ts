import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { Message, ContentBlock, ToolUseBlock, ToolResultBlock } from '@/types/message';
import { ToolExecution } from '@/types/tool';

// メッセージキャッシュの有効期限（1時間）
const MESSAGE_CACHE_EXPIRY_MS = 60 * 60 * 1000;
// キャッシュする最大セッション数
const MAX_CACHED_SESSIONS = 10;

interface CachedMessages {
  messages: Message[];
  cachedAt: number;
  lastMessageId: string | null;
}

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  isThinking: boolean;
  isLoadingHistory: boolean;
  currentStreamingMessage: string;
  currentStreamingId: string | null;
  // ストリーミング中のコンテンツブロック（時系列順）
  streamingContentBlocks: ContentBlock[];
  // 現在蓄積中のテキスト（次のツール実行までのテキスト）
  currentTextBuffer: string;
  toolExecutions: Record<string, ToolExecution>;
  // セッションごとのメッセージキャッシュ
  messageCache: Record<string, CachedMessages>;
  // 入力中のメッセージ（セッションごと）
  draftMessages: Record<string, string>;
  // 現在のセッションID
  currentSessionId: string | null;

  addMessage: (message: Message) => void;
  loadMessages: (messages: Message[]) => void;
  setLoadingHistory: (loading: boolean) => void;
  updateStreamingMessage: (text: string) => void;
  finalizeStreamingMessage: () => void;
  // ストリーミング中のコンテンツブロック操作
  appendTextToStream: (text: string) => void;
  appendToolUseToStream: (toolUse: ToolUseBlock) => void;
  appendToolResultToStream: (toolResult: ToolResultBlock) => void;
  getStreamingContentBlocks: () => ContentBlock[];
  startToolExecution: (toolExecution: Omit<ToolExecution, 'id' | 'startTime' | 'status'>) => void;
  updateToolExecution: (tool_use_id: string, updates: Partial<ToolExecution>) => void;
  setStreaming: (isStreaming: boolean) => void;
  setThinking: (isThinking: boolean) => void;
  clearMessages: () => void;
  // キャッシュ関連
  setCurrentSessionId: (sessionId: string | null) => void;
  cacheMessages: (sessionId: string, messages: Message[]) => void;
  getCachedMessages: (sessionId: string) => CachedMessages | null;
  isCacheValid: (sessionId: string) => boolean;
  appendToCache: (sessionId: string, message: Message) => void;
  cleanupOldCaches: () => void;
  // ドラフトメッセージ関連
  setDraftMessage: (sessionId: string, content: string) => void;
  getDraftMessage: (sessionId: string) => string;
  clearDraftMessage: (sessionId: string) => void;
  // ストリーミング中断時の保存
  savePartialStreamingMessage: (sessionId: string) => void;
}

// メッセージキャッシュとドラフトは永続化
export const useChatStore = create<ChatState>()(
  persist(
    devtools(
      (set, get) => ({
        messages: [],
        isStreaming: false,
        isThinking: false,
        isLoadingHistory: false,
        currentStreamingMessage: '',
        currentStreamingId: null,
        streamingContentBlocks: [],
        currentTextBuffer: '',
        toolExecutions: {},
        messageCache: {},
        draftMessages: {},
        currentSessionId: null,

        addMessage: (message) => {
          const { currentSessionId } = get();
          set((state) => ({
            messages: [...state.messages, message],
          }));
          // キャッシュにも追加
          if (currentSessionId) {
            get().appendToCache(currentSessionId, message);
          }
        },

        loadMessages: (messages) =>
          set({
            messages,
            toolExecutions: {},
          }),

        setLoadingHistory: (loading) =>
          set({ isLoadingHistory: loading }),

        updateStreamingMessage: (text) =>
          set((state) => ({
            currentStreamingMessage: state.currentStreamingMessage + text,
          })),

        finalizeStreamingMessage: () => {
          const {
            streamingContentBlocks,
            currentTextBuffer,
            currentStreamingId,
            messages,
            currentSessionId
          } = get();

          // 最終的なコンテンツブロックを構築
          const finalBlocks: ContentBlock[] = [...streamingContentBlocks];

          // 残りのテキストバッファがあれば追加
          if (currentTextBuffer.trim()) {
            finalBlocks.push({
              type: 'text',
              text: currentTextBuffer,
            });
          }

          // コンテンツがなければ何もしない
          if (finalBlocks.length === 0) return;

          const newMessage: Message = {
            id: currentStreamingId || crypto.randomUUID(),
            role: 'assistant',
            content: finalBlocks,
            timestamp: new Date().toISOString(),
          };

          set({
            messages: [...messages, newMessage],
            currentStreamingMessage: '',
            currentStreamingId: null,
            streamingContentBlocks: [],
            currentTextBuffer: '',
          });

          // キャッシュにも追加
          if (currentSessionId) {
            get().appendToCache(currentSessionId, newMessage);
          }
        },

        // ストリーミング中のテキストを追加
        appendTextToStream: (text) => {
          set((state) => ({
            currentTextBuffer: state.currentTextBuffer + text,
            // 互換性のため currentStreamingMessage も更新
            currentStreamingMessage: state.currentStreamingMessage + text,
          }));
        },

        // ストリーミング中にツール使用を追加（テキストを先にフラッシュ）
        appendToolUseToStream: (toolUse) => {
          set((state) => {
            const newBlocks = [...state.streamingContentBlocks];

            // 蓄積されたテキストがあれば先に追加
            if (state.currentTextBuffer.trim()) {
              newBlocks.push({
                type: 'text',
                text: state.currentTextBuffer,
              });
            }

            // ツール使用を追加
            newBlocks.push(toolUse);

            return {
              streamingContentBlocks: newBlocks,
              currentTextBuffer: '',
            };
          });
        },

        // ストリーミング中にツール結果を追加
        appendToolResultToStream: (toolResult) => {
          set((state) => ({
            streamingContentBlocks: [...state.streamingContentBlocks, toolResult],
          }));
        },

        // ストリーミング中のコンテンツブロックを取得（現在のテキストバッファを含む）
        getStreamingContentBlocks: () => {
          const { streamingContentBlocks, currentTextBuffer } = get();
          const blocks = [...streamingContentBlocks];

          // 現在蓄積中のテキストがあれば追加
          if (currentTextBuffer) {
            blocks.push({
              type: 'text',
              text: currentTextBuffer,
            });
          }

          return blocks;
        },

        startToolExecution: (toolExecution) => {
          const execution: ToolExecution = {
            ...toolExecution,
            id: crypto.randomUUID(),
            status: 'executing',
            startTime: Date.now(),
          };

          set((state) => ({
            toolExecutions: {
              ...state.toolExecutions,
              [execution.tool_use_id]: execution,
            },
          }));
        },

        updateToolExecution: (tool_use_id, updates) => {
          set((state) => {
            const existing = state.toolExecutions[tool_use_id];

            console.log('[chatStore] updateToolExecution:', {
              tool_use_id,
              updates,
              existingStatus: existing?.status,
              existingName: existing?.name,
            });

            // If the tool execution doesn't exist yet, create a placeholder
            // This handles race conditions where tool_result arrives before tool_use_start
            if (!existing) {
              // Only create if we have meaningful updates (status change)
              if (updates.status) {
                const newExecution: ToolExecution = {
                  id: crypto.randomUUID(),
                  tool_use_id,
                  name: updates.name || 'Unknown',
                  input: updates.input || {},
                  status: updates.status,
                  output: updates.output,
                  error: updates.error,
                  startTime: updates.startTime || Date.now(),
                  endTime: updates.endTime,
                };
                console.log('[chatStore] Created new execution:', newExecution);
                return {
                  toolExecutions: {
                    ...state.toolExecutions,
                    [tool_use_id]: newExecution,
                  },
                };
              }
              console.log('[chatStore] No existing execution and no status update, skipping');
              return state;
            }

            const updated = { ...existing, ...updates };
            console.log('[chatStore] Updated execution:', updated);
            return {
              toolExecutions: {
                ...state.toolExecutions,
                [tool_use_id]: updated,
              },
            };
          });
        },

        setStreaming: (isStreaming) => {
          set({ isStreaming });
          if (isStreaming) {
            set({
              currentStreamingId: crypto.randomUUID(),
              streamingContentBlocks: [],
              currentTextBuffer: '',
              toolExecutions: {},
            });
          }
        },

        setThinking: (isThinking) =>
          set({ isThinking }),

        clearMessages: () =>
          set({
            messages: [],
            currentStreamingMessage: '',
            currentStreamingId: null,
            streamingContentBlocks: [],
            currentTextBuffer: '',
            toolExecutions: {},
          }),

        // キャッシュ関連メソッド
        setCurrentSessionId: (sessionId) =>
          set({ currentSessionId: sessionId }),

        cacheMessages: (sessionId, messages) => {
          const lastMessage = messages[messages.length - 1];
          set((state) => ({
            messageCache: {
              ...state.messageCache,
              [sessionId]: {
                messages,
                cachedAt: Date.now(),
                lastMessageId: lastMessage?.id || null,
              },
            },
          }));
          // 古いキャッシュをクリーンアップ
          get().cleanupOldCaches();
        },

        getCachedMessages: (sessionId) => {
          const cache = get().messageCache[sessionId];
          if (!cache) return null;
          // 有効期限チェック
          if (Date.now() - cache.cachedAt > MESSAGE_CACHE_EXPIRY_MS) {
            return null;
          }
          return cache;
        },

        isCacheValid: (sessionId) => {
          const cache = get().messageCache[sessionId];
          if (!cache) return false;
          return Date.now() - cache.cachedAt < MESSAGE_CACHE_EXPIRY_MS;
        },

        appendToCache: (sessionId, message) => {
          set((state) => {
            const cache = state.messageCache[sessionId];
            if (!cache) return state;

            // 重複チェック
            if (cache.messages.some((m) => m.id === message.id)) {
              return state;
            }

            return {
              messageCache: {
                ...state.messageCache,
                [sessionId]: {
                  ...cache,
                  messages: [...cache.messages, message],
                  lastMessageId: message.id,
                  cachedAt: Date.now(),
                },
              },
            };
          });
        },

        cleanupOldCaches: () => {
          const { messageCache } = get();
          const sessionIds = Object.keys(messageCache);

          if (sessionIds.length <= MAX_CACHED_SESSIONS) return;

          // 古いキャッシュを削除（cachedAtでソート）
          const sortedEntries = Object.entries(messageCache)
            .sort(([, a], [, b]) => b.cachedAt - a.cachedAt)
            .slice(0, MAX_CACHED_SESSIONS);

          const newCache: Record<string, CachedMessages> = {};
          sortedEntries.forEach(([id, cache]) => {
            newCache[id] = cache;
          });

          set({ messageCache: newCache });
        },

        // ドラフトメッセージ関連
        setDraftMessage: (sessionId, content) =>
          set((state) => ({
            draftMessages: {
              ...state.draftMessages,
              [sessionId]: content,
            },
          })),

        getDraftMessage: (sessionId) => {
          return get().draftMessages[sessionId] || '';
        },

        clearDraftMessage: (sessionId) =>
          set((state) => {
            const { [sessionId]: _, ...rest } = state.draftMessages;
            return { draftMessages: rest };
          }),

        // ストリーミング中断時の保存
        savePartialStreamingMessage: (sessionId) => {
          const { currentStreamingMessage, messages, currentStreamingId } = get();

          if (!currentStreamingMessage) return;

          const partialMessage: Message = {
            id: currentStreamingId || crypto.randomUUID(),
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: currentStreamingMessage + '\n\n[Streaming interrupted]',
              } as ContentBlock,
            ],
            timestamp: new Date().toISOString(),
          };

          set({
            messages: [...messages, partialMessage],
            currentStreamingMessage: '',
            currentStreamingId: null,
            isStreaming: false,
          });

          // キャッシュにも追加
          get().appendToCache(sessionId, partialMessage);
        },
      }),
      { name: 'chat-storage' }
    ),
    {
      name: 'chat-cache-storage',
      storage: createJSONStorage(() => localStorage),
      // 永続化するのはキャッシュとドラフトのみ
      partialize: (state) => ({
        messageCache: state.messageCache,
        draftMessages: state.draftMessages,
      }),
    }
  )
);

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { Message, ContentBlock } from '@/types/message';
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
          const { currentStreamingMessage, currentStreamingId, messages, currentSessionId } = get();

          if (!currentStreamingMessage) return;

          const newMessage: Message = {
            id: currentStreamingId || crypto.randomUUID(),
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: currentStreamingMessage,
              } as ContentBlock,
            ],
            timestamp: new Date().toISOString(),
          };

          set({
            messages: [...messages, newMessage],
            currentStreamingMessage: '',
            currentStreamingId: null,
          });

          // キャッシュにも追加
          if (currentSessionId) {
            get().appendToCache(currentSessionId, newMessage);
          }
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
            if (!existing) return state;

            return {
              toolExecutions: {
                ...state.toolExecutions,
                [tool_use_id]: { ...existing, ...updates },
              },
            };
          });
        },

        setStreaming: (isStreaming) => {
          set({ isStreaming });
          if (isStreaming) {
            set({
              currentStreamingId: crypto.randomUUID(),
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

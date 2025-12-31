import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { Message, ContentBlock, ToolUseBlock, ToolResultBlock } from '@/types/message';
import { ToolExecution } from '@/types/tool';
import { Question } from '@/types/websocket';

// 設定定数
const CONFIG = {
  MESSAGE_CACHE_EXPIRY_MS: 60 * 60 * 1000, // 1時間
  MAX_CACHED_SESSIONS: 10,
} as const;

// 質問待ち状態
export interface PendingQuestion {
  toolUseId: string;
  questions: Question[];
}

// メッセージキャッシュ
interface CachedMessages {
  messages: Message[];
  cachedAt: number;
  lastMessageId: string | null;
}

// ストリーミング状態
interface StreamingState {
  isStreaming: boolean;
  isThinking: boolean;
  currentStreamingMessage: string;
  currentStreamingId: string | null;
  streamingContentBlocks: ContentBlock[];
  currentTextBuffer: string;
}

// ストア状態
interface ChatState extends StreamingState {
  messages: Message[];
  isLoadingHistory: boolean;
  toolExecutions: Record<string, ToolExecution>;
  messageCache: Record<string, CachedMessages>;
  draftMessages: Record<string, string>;
  currentSessionId: string | null;
  pendingQuestion: PendingQuestion | null;
}

// ストアアクション
interface ChatActions {
  // メッセージ操作
  addMessage: (message: Message) => void;
  loadMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setLoadingHistory: (loading: boolean) => void;

  // ストリーミング操作
  setStreaming: (isStreaming: boolean) => void;
  setThinking: (isThinking: boolean) => void;
  updateStreamingMessage: (text: string) => void;
  finalizeStreamingMessage: () => void;
  appendTextToStream: (text: string) => void;
  appendToolUseToStream: (toolUse: ToolUseBlock) => void;
  appendToolResultToStream: (toolResult: ToolResultBlock) => void;
  getStreamingContentBlocks: () => ContentBlock[];

  // ツール実行操作
  startToolExecution: (toolExecution: Omit<ToolExecution, 'id' | 'startTime' | 'status'>) => void;
  updateToolExecution: (tool_use_id: string, updates: Partial<ToolExecution>) => void;

  // キャッシュ操作
  setCurrentSessionId: (sessionId: string | null) => void;
  cacheMessages: (sessionId: string, messages: Message[]) => void;
  getCachedMessages: (sessionId: string) => CachedMessages | null;
  isCacheValid: (sessionId: string) => boolean;
  appendToCache: (sessionId: string, message: Message) => void;
  cleanupOldCaches: () => void;

  // ドラフト操作
  setDraftMessage: (sessionId: string, content: string) => void;
  getDraftMessage: (sessionId: string) => string;
  clearDraftMessage: (sessionId: string) => void;
  savePartialStreamingMessage: (sessionId: string) => void;

  // 質問操作
  setPendingQuestion: (question: PendingQuestion | null) => void;
  clearPendingQuestion: () => void;
}

// 初期ストリーミング状態
const initialStreamingState: StreamingState = {
  isStreaming: false,
  isThinking: false,
  currentStreamingMessage: '',
  currentStreamingId: null,
  streamingContentBlocks: [],
  currentTextBuffer: '',
};

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    devtools(
      (set, get) => ({
        // 初期状態
        ...initialStreamingState,
        messages: [],
        isLoadingHistory: false,
        toolExecutions: {},
        messageCache: {},
        draftMessages: {},
        currentSessionId: null,
        pendingQuestion: null,

        // === メッセージ操作 ===
        addMessage: (message) => {
          const { currentSessionId } = get();
          set((state) => ({
            messages: [...state.messages, message],
          }));
          if (currentSessionId) {
            get().appendToCache(currentSessionId, message);
          }
        },

        loadMessages: (messages) => set({
          messages,
          toolExecutions: {},
        }),

        clearMessages: () => set({
          messages: [],
          ...initialStreamingState,
          toolExecutions: {},
        }),

        setLoadingHistory: (loading) => set({ isLoadingHistory: loading }),

        // === ストリーミング操作 ===
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

        setThinking: (isThinking) => set({ isThinking }),

        updateStreamingMessage: (text) => set((state) => ({
          currentStreamingMessage: state.currentStreamingMessage + text,
        })),

        finalizeStreamingMessage: () => {
          const {
            streamingContentBlocks,
            currentTextBuffer,
            currentStreamingId,
            messages,
            currentSessionId,
          } = get();

          // 最終的なコンテンツブロックを構築
          const finalBlocks: ContentBlock[] = [...streamingContentBlocks];

          if (currentTextBuffer.trim()) {
            finalBlocks.push({
              type: 'text',
              text: currentTextBuffer,
            });
          }

          if (finalBlocks.length === 0) return;

          const newMessage: Message = {
            id: currentStreamingId || crypto.randomUUID(),
            role: 'assistant',
            content: finalBlocks,
            timestamp: new Date().toISOString(),
          };

          set({
            messages: [...messages, newMessage],
            ...initialStreamingState,
          });

          if (currentSessionId) {
            get().appendToCache(currentSessionId, newMessage);
          }
        },

        appendTextToStream: (text) => set((state) => ({
          currentTextBuffer: state.currentTextBuffer + text,
          currentStreamingMessage: state.currentStreamingMessage + text,
        })),

        appendToolUseToStream: (toolUse) => set((state) => {
          const newBlocks = [...state.streamingContentBlocks];

          if (state.currentTextBuffer.trim()) {
            newBlocks.push({
              type: 'text',
              text: state.currentTextBuffer,
            });
          }

          newBlocks.push(toolUse);

          return {
            streamingContentBlocks: newBlocks,
            currentTextBuffer: '',
          };
        }),

        appendToolResultToStream: (toolResult) => set((state) => ({
          streamingContentBlocks: [...state.streamingContentBlocks, toolResult],
        })),

        getStreamingContentBlocks: () => {
          const { streamingContentBlocks, currentTextBuffer } = get();
          const blocks = [...streamingContentBlocks];

          if (currentTextBuffer) {
            blocks.push({
              type: 'text',
              text: currentTextBuffer,
            });
          }

          return blocks;
        },

        // === ツール実行操作 ===
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

        updateToolExecution: (tool_use_id, updates) => set((state) => {
          const existing = state.toolExecutions[tool_use_id];

          if (!existing) {
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
              return {
                toolExecutions: {
                  ...state.toolExecutions,
                  [tool_use_id]: newExecution,
                },
              };
            }
            return state;
          }

          return {
            toolExecutions: {
              ...state.toolExecutions,
              [tool_use_id]: { ...existing, ...updates },
            },
          };
        }),

        // === キャッシュ操作 ===
        setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),

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
          get().cleanupOldCaches();
        },

        getCachedMessages: (sessionId) => {
          const cache = get().messageCache[sessionId];
          if (!cache) return null;
          if (Date.now() - cache.cachedAt > CONFIG.MESSAGE_CACHE_EXPIRY_MS) {
            return null;
          }
          return cache;
        },

        isCacheValid: (sessionId) => {
          const cache = get().messageCache[sessionId];
          if (!cache) return false;
          return Date.now() - cache.cachedAt < CONFIG.MESSAGE_CACHE_EXPIRY_MS;
        },

        appendToCache: (sessionId, message) => set((state) => {
          const cache = state.messageCache[sessionId];
          if (!cache) return state;

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
        }),

        cleanupOldCaches: () => {
          const { messageCache } = get();
          const sessionIds = Object.keys(messageCache);

          if (sessionIds.length <= CONFIG.MAX_CACHED_SESSIONS) return;

          const sortedEntries = Object.entries(messageCache)
            .sort(([, a], [, b]) => b.cachedAt - a.cachedAt)
            .slice(0, CONFIG.MAX_CACHED_SESSIONS);

          const newCache: Record<string, CachedMessages> = {};
          sortedEntries.forEach(([id, cache]) => {
            newCache[id] = cache;
          });

          set({ messageCache: newCache });
        },

        // === ドラフト操作 ===
        setDraftMessage: (sessionId, content) => set((state) => ({
          draftMessages: {
            ...state.draftMessages,
            [sessionId]: content,
          },
        })),

        getDraftMessage: (sessionId) => get().draftMessages[sessionId] || '',

        clearDraftMessage: (sessionId) => set((state) => {
          const { [sessionId]: _, ...rest } = state.draftMessages;
          return { draftMessages: rest };
        }),

        savePartialStreamingMessage: (sessionId) => {
          const { currentStreamingMessage, messages, currentStreamingId } = get();

          if (!currentStreamingMessage) return;

          const partialMessage: Message = {
            id: currentStreamingId || crypto.randomUUID(),
            role: 'assistant',
            content: [{
              type: 'text',
              text: currentStreamingMessage + '\n\n[Streaming interrupted]',
            }],
            timestamp: new Date().toISOString(),
          };

          set({
            messages: [...messages, partialMessage],
            ...initialStreamingState,
          });

          get().appendToCache(sessionId, partialMessage);
        },

        // === 質問操作 ===
        setPendingQuestion: (question) => set({ pendingQuestion: question }),
        clearPendingQuestion: () => set({ pendingQuestion: null }),
      }),
      { name: 'chat-storage' }
    ),
    {
      name: 'chat-cache-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messageCache: state.messageCache,
        draftMessages: state.draftMessages,
      }),
    }
  )
);

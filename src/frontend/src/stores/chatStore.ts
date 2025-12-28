import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Message, ContentBlock } from '@/types/message';
import { ToolExecution } from '@/types/tool';

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  isThinking: boolean;
  isLoadingHistory: boolean;
  currentStreamingMessage: string;
  currentStreamingId: string | null;
  toolExecutions: Record<string, ToolExecution>;

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
}

// メッセージはセッションごとに異なるため、永続化しない
export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
        messages: [],
        isStreaming: false,
        isThinking: false,
        isLoadingHistory: false,
        currentStreamingMessage: '',
        currentStreamingId: null,
        toolExecutions: {},

        addMessage: (message) =>
          set((state) => ({
            messages: [...state.messages, message]
          })),

        loadMessages: (messages) =>
          set({
            messages,
            toolExecutions: {},
          }),

        setLoadingHistory: (loading) =>
          set({ isLoadingHistory: loading }),

        updateStreamingMessage: (text) =>
          set((state) => ({
            currentStreamingMessage: state.currentStreamingMessage + text
          })),

        finalizeStreamingMessage: () => {
          const { currentStreamingMessage, currentStreamingId, messages } = get();

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
        },

        startToolExecution: (toolExecution) => {
          const execution: ToolExecution = {
            ...toolExecution,
            id: crypto.randomUUID(),
            status: 'executing',  // 開始時点で実行中に設定
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
            // 新しいメッセージ開始時にツール実行をクリア
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
      }),
    { name: 'chat-storage' }
  )
);

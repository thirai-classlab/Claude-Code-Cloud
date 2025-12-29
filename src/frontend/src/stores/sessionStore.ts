import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Session } from '@/types/session';

// セッションデータの有効期限（7日間）
const SESSION_EXPIRY_DAYS = 7;
const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;


interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
  isLoading: boolean;
  lastSyncedAt: number | null;
  // セッションごとのキャッシュタイムスタンプ
  sessionCacheTimestamps: Record<string, number>;

  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  removeSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string | null) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  clearSessions: () => void;
  cleanupExpiredSessions: () => void;
  isSessionCached: (sessionId: string) => boolean;
  markSessionCached: (sessionId: string) => void;
}

// 有効期限が切れたセッションをフィルタリング
const filterExpiredSessions = (
  sessions: Session[],
  timestamps: Record<string, number>
): Session[] => {
  const now = Date.now();
  return sessions.filter((session) => {
    const cachedAt = timestamps[session.id];
    if (!cachedAt) return true; // タイムスタンプがない場合は保持
    return now - cachedAt < SESSION_EXPIRY_MS;
  });
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      lastSyncedAt: null,
      sessionCacheTimestamps: {},

      setSessions: (sessions) => {
        const now = Date.now();
        const timestamps = { ...get().sessionCacheTimestamps };

        // 新しいセッションにタイムスタンプを設定
        sessions.forEach((session) => {
          if (!timestamps[session.id]) {
            timestamps[session.id] = now;
          }
        });

        set({
          sessions,
          lastSyncedAt: now,
          sessionCacheTimestamps: timestamps,
        });
      },

      addSession: (session) =>
        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: session.id,
          sessionCacheTimestamps: {
            ...state.sessionCacheTimestamps,
            [session.id]: Date.now(),
          },
        })),

      removeSession: (sessionId) =>
        set((state) => {
          const { [sessionId]: _, ...restTimestamps } = state.sessionCacheTimestamps;
          return {
            sessions: state.sessions.filter((s) => s.id !== sessionId),
            currentSessionId:
              state.currentSessionId === sessionId
                ? null
                : state.currentSessionId,
            sessionCacheTimestamps: restTimestamps,
          };
        }),

      setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),

      updateSessionTitle: (sessionId, title) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, name: title } : s
          ),
        })),

      updateSession: (sessionId, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, ...updates } : s
          ),
        })),

      clearSessions: () =>
        set({
          sessions: [],
          currentSessionId: null,
          lastSyncedAt: null,
          sessionCacheTimestamps: {},
        }),

      cleanupExpiredSessions: () =>
        set((state) => {
          const validSessions = filterExpiredSessions(
            state.sessions,
            state.sessionCacheTimestamps
          );
          const validIds = new Set(validSessions.map((s) => s.id));

          // 有効期限切れのタイムスタンプを削除
          const cleanedTimestamps: Record<string, number> = {};
          Object.entries(state.sessionCacheTimestamps).forEach(([id, ts]) => {
            if (validIds.has(id)) {
              cleanedTimestamps[id] = ts;
            }
          });

          return {
            sessions: validSessions,
            sessionCacheTimestamps: cleanedTimestamps,
            currentSessionId: validIds.has(state.currentSessionId || '')
              ? state.currentSessionId
              : null,
          };
        }),

      isSessionCached: (sessionId) => {
        const timestamps = get().sessionCacheTimestamps;
        const cachedAt = timestamps[sessionId];
        if (!cachedAt) return false;
        return Date.now() - cachedAt < SESSION_EXPIRY_MS;
      },

      markSessionCached: (sessionId) =>
        set((state) => ({
          sessionCacheTimestamps: {
            ...state.sessionCacheTimestamps,
            [sessionId]: Date.now(),
          },
        })),
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        lastSyncedAt: state.lastSyncedAt,
        sessionCacheTimestamps: state.sessionCacheTimestamps,
      }),
      // ストレージからの復元時に有効期限切れセッションをクリーンアップ
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.cleanupExpiredSessions();
        }
      },
    }
  )
);

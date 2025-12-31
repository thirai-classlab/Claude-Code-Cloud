/**
 * Session API Client
 * Handles session-level operations
 */

import { apiClient } from './client';
import { Session } from '@/types/session';

export interface UpdateSessionRequest {
  title?: string;
  name?: string;
  model?: string;
}

// APIから返されるメッセージの形式（バックエンドのChatMessageResponse）
export interface ApiChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens?: number;
  created_at: string;
}

export interface MessagesResponse {
  session_id: string;
  messages: ApiChatMessage[];
  total: number;
}

export const sessionsApi = {
  /**
   * Get a session by ID
   */
  async get(sessionId: string): Promise<Session> {
    return apiClient.get<Session>(`/api/sessions/${sessionId}`);
  },

  /**
   * Update a session
   */
  async update(sessionId: string, data: UpdateSessionRequest): Promise<Session> {
    return apiClient.put<Session>(`/api/sessions/${sessionId}`, data);
  },

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    return apiClient.delete<void>(`/api/sessions/${sessionId}`);
  },

  /**
   * Get all messages in a session
   */
  async getMessages(sessionId: string): Promise<MessagesResponse> {
    return apiClient.get<MessagesResponse>(`/api/sessions/${sessionId}/messages`);
  },
};

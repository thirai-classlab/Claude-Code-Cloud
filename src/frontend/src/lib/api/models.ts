/**
 * Models API Client
 * 利用可能なClaudeモデル一覧を取得
 */

import { apiClient } from './client';

export interface ModelInfo {
  id: string;
  display_name: string;
  created_at?: string;
  type: string;
}

export interface ModelsResponse {
  models: ModelInfo[];
  total: number;
}

export const modelsApi = {
  /**
   * 利用可能なモデル一覧を取得
   * @param refresh キャッシュを無視するかどうか
   */
  async list(refresh = false): Promise<ModelsResponse> {
    const query = refresh ? '?refresh=true' : '';
    return apiClient.get<ModelsResponse>(`/api/models${query}`);
  },

  /**
   * 推奨モデル一覧を取得（チャット向けにフィルタリング）
   */
  async listRecommended(): Promise<ModelsResponse> {
    return apiClient.get<ModelsResponse>('/api/models/recommended');
  },
};

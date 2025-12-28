import { Message } from './message';

export interface Session {
  id: string;
  project_id: string;
  title: string;
  status: 'active' | 'expired' | 'terminated';
  created_at: string;
  updated_at: string;
  expires_at: string;
  message_count: number;
  model: string;
  workspace_path: string;
}

export interface SessionHistory {
  session_id: string;
  project_id: string;
  messages: Message[];
  total_cost: number;
  total_tokens: {
    input: number;
    output: number;
  };
}

export interface CreateSessionRequest {
  title?: string;
  options?: {
    model?: string;
    max_turns?: number;
  };
  sandbox_config?: {
    allowed_tools?: string[];
    permission_mode?: string;
  };
}

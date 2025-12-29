import { Message } from './message';

export interface Session {
  id: string;
  project_id: string;
  name: string;
  status: 'active' | 'expired' | 'terminated';
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  message_count: number;
  model: string;
  total_tokens?: number;
  total_cost_usd?: number;
  user_id?: string;
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
  name?: string;
  model?: string;
}

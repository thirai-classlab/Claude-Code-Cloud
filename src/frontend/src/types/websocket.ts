export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Client -> Server
export interface WSChatMessage {
  type: 'chat';
  content: string;
  files?: Array<{
    path: string;
    content: string;
  }>;
}

export interface WSInterruptMessage {
  type: 'interrupt';
}

export type WSClientMessage = WSChatMessage | WSInterruptMessage;

// Server -> Client
export interface WSTextMessage {
  type: 'text';
  content: string;
}

export interface WSThinkingMessage {
  type: 'thinking';
}

export interface WSToolUseStartMessage {
  type: 'tool_use_start';
  tool_use_id: string;
  tool: string;
  input?: Record<string, any>;
}

export interface WSToolExecutingMessage {
  type: 'tool_executing';
  tool_use_id: string;
  tool: string;
  input: Record<string, any>;
}

export interface WSToolResultMessage {
  type: 'tool_result';
  tool_use_id: string;
  success: boolean;
  output: string;
}

export interface WSResultMessage {
  type: 'result';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  cost?: number;
}

export interface WSErrorMessage {
  type: 'error';
  message?: string;
  error?: string;
  code?: string;
}

export interface WSInterruptedMessage {
  type: 'interrupted';
  message: string;
}

export type WSServerMessage =
  | WSTextMessage
  | WSThinkingMessage
  | WSToolUseStartMessage
  | WSToolExecutingMessage
  | WSToolResultMessage
  | WSResultMessage
  | WSErrorMessage
  | WSInterruptedMessage;

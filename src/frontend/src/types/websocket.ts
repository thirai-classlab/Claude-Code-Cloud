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

// AskUserQuestion への回答
export interface WSQuestionAnswerMessage {
  type: 'question_answer';
  tool_use_id: string;
  answers: Record<string, string>; // questionIndex -> selectedOptionIndex or "other:text"
}

export type WSClientMessage = WSChatMessage | WSInterruptMessage | WSQuestionAnswerMessage;

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

// ストリーム再開関連
export interface WSResumeStartedMessage {
  type: 'resume_started';
  sdk_session_id: string;
  timestamp: number;
}

export interface WSResumeNotNeededMessage {
  type: 'resume_not_needed';
  message: string;
  timestamp: number;
}

export interface WSResumeFailedMessage {
  type: 'resume_failed';
  error: string;
  timestamp: number;
}

// AskUserQuestion 質問メッセージ
export interface QuestionOption {
  label: string;
  description: string;
}

export interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

export interface WSUserQuestionMessage {
  type: 'user_question';
  tool_use_id: string;
  questions: Question[];
  timestamp: number;
}

export type WSServerMessage =
  | WSTextMessage
  | WSThinkingMessage
  | WSToolUseStartMessage
  | WSToolExecutingMessage
  | WSToolResultMessage
  | WSResultMessage
  | WSErrorMessage
  | WSInterruptedMessage
  | WSResumeStartedMessage
  | WSResumeNotNeededMessage
  | WSResumeFailedMessage
  | WSUserQuestionMessage;

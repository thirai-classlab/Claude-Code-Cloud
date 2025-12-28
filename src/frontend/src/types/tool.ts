export type ToolExecutionStatus = 'pending' | 'executing' | 'success' | 'error';

export interface ToolExecution {
  id: string;
  tool_use_id: string;
  name: string;
  input: Record<string, any>;
  status: ToolExecutionStatus;
  output?: string;
  error?: string;
  startTime: number;
  endTime?: number;
}

export interface ToolExecutionUpdate {
  tool_use_id: string;
  status?: ToolExecutionStatus;
  output?: string;
  error?: string;
}

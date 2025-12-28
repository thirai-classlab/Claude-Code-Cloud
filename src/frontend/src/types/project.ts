import { Session } from './session';

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  session_count: number;
  workspace_path: string;
}

export interface ProjectWithSessions extends Project {
  sessions: Session[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

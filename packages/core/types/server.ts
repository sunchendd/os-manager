import type { IssueStatus } from "./issue";

export interface Server {
  id: string;
  workspace_id: string;
  name: string;
  host: string;
  environment: string;
  ssh_username: string;
  credential_ref: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateServerRequest {
  name: string;
  host: string;
  environment?: string;
  ssh_username: string;
  credential_ref: string;
  tags?: string[];
}

export interface UpdateServerRequest {
  name?: string;
  host?: string;
  environment?: string;
  ssh_username?: string;
  credential_ref?: string;
  tags?: string[];
}

export interface ListServersResponse {
  servers: Server[];
  total: number;
}

export interface ServerMetricSnapshot {
  cpu_idle_percent: number;
  memory_free_percent: number;
  disk_free_percent: number;
  gpu_free_percent: number;
  collected_at: string;
}

export interface ServerRelatedIssue {
  id: string;
  identifier: string;
  title: string;
  status: IssueStatus;
}

export interface ListServerRelatedIssuesResponse {
  issues: ServerRelatedIssue[];
}
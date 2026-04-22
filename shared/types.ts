export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'command' | 'risk' | 'error';
  command?: string;
  riskLevel?: 'safe' | 'warning' | 'danger';
  timestamp: number;
}

export interface Session {
  id: string;
  messages: Message[];
  systemInfo?: SystemInfo;
  createdAt: number;
  updatedAt: number;
}

export interface SystemInfo {
  hostname: string;
  os: string;
  version: string;
  cpu: string;
  memory: {
    total: string;
    used: string;
    free: string;
  };
  disk: {
    filesystem: string;
    size: string;
    used: string;
    available: string;
    usePercent: string;
  }[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface RiskAssessment {
  level: 'safe' | 'warning' | 'danger';
  reason: string;
  command: string;
}

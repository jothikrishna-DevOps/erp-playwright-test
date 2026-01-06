// Shared TypeScript types for backend, frontend, and agent

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export type TestStatus = 
  | 'pending' 
  | 'recording' 
  | 'ready' 
  | 'running' 
  | 'completed' 
  | 'failed';

export type AgentStatus = 'idle' | 'recording' | 'running';

export interface Test {
  id: string;
  name: string;
  url: string;
  browser: BrowserType;
  description?: string;
  folderName?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: TestStatus;
  filePath?: string;
  version: number;
}

export interface Agent {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  lastSeen: Date;
  currentTestId?: string;
}

// WebSocket Messages
export type WSMessageType = 
  | 'agent:register'
  | 'agent:status'
  | 'agent:heartbeat'
  | 'command:record'
  | 'command:run'
  | 'command:stop'
  | 'test:update';

export interface WSMessage {
  type: WSMessageType;
  [key: string]: any;
}

export interface AgentRegisterMessage extends WSMessage {
  type: 'agent:register';
  agentId: string;
  token: string;
  name?: string;
}

export interface AgentStatusMessage extends WSMessage {
  type: 'agent:status';
  agentId: string;
  status: AgentStatus;
  message?: string;
  testId?: string;
}

export interface CommandRecordMessage extends WSMessage {
  type: 'command:record';
  testId: string;
  url: string;
  browser: BrowserType;
}

export interface CommandRunMessage extends WSMessage {
  type: 'command:run';
  testId: string;
  mode: 'headless' | 'visible';
}

export interface CommandStopMessage extends WSMessage {
  type: 'command:stop';
  testId: string;
}

// API Request/Response Types
export interface CreateTestRequest {
  name: string;
  url: string;
  browser?: BrowserType;
  description?: string;
  folderName?: string;
  createdBy?: string;
}

export interface RunTestRequest {
  mode: 'headless' | 'visible';
}

export interface AgentLoginRequest {
  agentId: string;
  token: string;
}


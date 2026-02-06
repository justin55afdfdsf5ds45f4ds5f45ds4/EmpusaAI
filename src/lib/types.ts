export type AgentStatus = 'running' | 'paused' | 'loop_detected' | 'failed' | 'success';

export interface Checkpoint {
  step: number;
  action: string;
  status: 'success' | 'failure' | 'loop_detected';
  error?: string;
  time: string;
}

export interface AgentSession {
  id: string;
  name: string;
  status: AgentStatus;
  uptime: string;
  loops: number;
}

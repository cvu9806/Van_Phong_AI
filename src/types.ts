export type Agent = { id: string; name: string; role: string; color: string };
export type Step = { agentId: string; text: string; completedAt: string };
export type Job = { id: string; prompt: string; mode: 'demo' | 'live'; provider?: 'demo' | 'codex' | 'openai'; status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'; queuePosition?: number; retryOf?: string; startedAt?: string; finishedAt?: string; currentAgent: string | null; steps: Step[]; createdAt: string; error?: string };
export type OfficeState = { mode: 'demo' | 'live'; provider?: 'demo' | 'codex' | 'openai'; queueLimit?: number; totals?: Record<Job['status'], number>; agents: Agent[]; jobs: Job[] };

import { create } from 'zustand';
import type { LlmTrace } from '../../api/llmApi';

const emptyTrace: LlmTrace = { content: '', reasoning: '', stages: [] };

export interface LoopMetrics {
  sessionId: string | null;
  status: string;
  tokensIn: number;
  tokensOut: number;
  cacheTokens: number;
  cacheHits: number;
  agentName: string;
  modelName: string;
  trace: LlmTrace;
}

const idle: LoopMetrics = {
  sessionId: null,
  status: 'idle',
  tokensIn: 0,
  tokensOut: 0,
  cacheTokens: 0,
  cacheHits: 0,
  agentName: '',
  modelName: '',
  trace: emptyTrace,
};

/** Live-трасса принадлежит сессии, только если цикл запущен в ней — иначе при переключении возникает фантомный стрим. */
export function shouldShowLive(loopSessionId: string | null, focused: string | null): boolean {
  return loopSessionId !== null && loopSessionId === focused;
}

interface LoopMetricsState extends LoopMetrics {
  setMetrics: (next: Partial<LoopMetrics>) => void;
  reset: () => void;
}

export const useLoopMetrics = create<LoopMetricsState>((set) => ({
  ...idle,
  setMetrics: (next) => set(next),
  reset: () => set(idle),
}));

import { create } from 'zustand';
import type { LlmTrace } from '../../api/llmApi';

const emptyTrace: LlmTrace = { content: '', reasoning: '', stages: [] };

export interface LoopMetrics {
  status: string;
  tokensIn: number;
  tokensOut: number;
  cacheTokens: number;
  cacheHits: number;
  agentName: string;
  trace: LlmTrace;
}

const idle: LoopMetrics = {
  status: 'idle',
  tokensIn: 0,
  tokensOut: 0,
  cacheTokens: 0,
  cacheHits: 0,
  agentName: '',
  trace: emptyTrace,
};

interface LoopMetricsState extends LoopMetrics {
  setMetrics: (next: Partial<LoopMetrics>) => void;
  reset: () => void;
}

export const useLoopMetrics = create<LoopMetricsState>((set) => ({
  ...idle,
  setMetrics: (next) => set(next),
  reset: () => set(idle),
}));

import { create } from 'zustand';

export interface LoopMetrics {
  status: string;
  tokensIn: number;
  tokensOut: number;
  cacheTokens: number;
  cacheHits: number;
}

const idle: LoopMetrics = {
  status: 'idle',
  tokensIn: 0,
  tokensOut: 0,
  cacheTokens: 0,
  cacheHits: 0,
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

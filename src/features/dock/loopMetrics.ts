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

export interface StageLike {
  kind: string;
  name: string;
  args?: string;
  status: string;
}

export function sameStages(a: readonly StageLike[], b: readonly StageLike[]): boolean {
  return (
    a.length === b.length &&
    a.every((stage, index) => {
      const other = b[index];
      return (
        other !== undefined &&
        stage.kind === other.kind &&
        stage.name === other.name &&
        stage.status === other.status &&
        (stage.args ?? '') === (other.args ?? '')
      );
    })
  );
}

export function sameTrace(a: LlmTrace, b: LlmTrace): boolean {
  return a.content === b.content && a.reasoning === b.reasoning && sameStages(a.stages, b.stages);
}

interface LoopMetricsState extends LoopMetrics {
  setMetrics: (next: Partial<LoopMetrics>) => void;
  reset: () => void;
}

export const useLoopMetrics = create<LoopMetricsState>((set) => ({
  ...idle,
  // Идентичный полл (120 мс) не должен будить подписчиков — иначе ChatPane рендерится впустую каждый тик.
  setMetrics: (next) =>
    set((state) => {
      const patch: Partial<LoopMetrics> = { ...next };
      if (patch.trace && sameTrace(state.trace, patch.trace)) {
        delete patch.trace;
      }
      const changed = (Object.keys(patch) as (keyof LoopMetrics)[]).some(
        (key) => !Object.is(state[key], patch[key]),
      );
      return changed ? patch : state;
    }),
  reset: () => set(idle),
}));

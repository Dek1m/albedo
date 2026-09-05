import { beforeEach, describe, expect, it } from 'vitest';
import type { LlmStage, LlmTrace } from '../../api/llmApi';
import { sameStages, sameTrace, shouldShowLive, useLoopMetrics } from './loopMetrics';

const stage = (over: Partial<LlmStage> = {}): LlmStage => ({
  kind: 'tool',
  name: 'bash',
  args: 'ls',
  status: 'done',
  ...over,
});

const trace = (content: string, reasoning = '', stages: LlmStage[] = []): LlmTrace => ({
  content,
  reasoning,
  stages,
});

describe('shouldShowLive', () => {
  it('matches only the session that started the loop', () => {
    expect(shouldShowLive('s1', 's1')).toBe(true);
    expect(shouldShowLive('s1', 's2')).toBe(false);
    expect(shouldShowLive('s1', null)).toBe(false);
    expect(shouldShowLive(null, 's1')).toBe(false);
    expect(shouldShowLive(null, null)).toBe(false);
  });
});

describe('sameStages', () => {
  it('compares kind, name, args and status', () => {
    expect(sameStages([stage()], [stage()])).toBe(true);
    expect(sameStages([stage()], [stage({ status: 'running' })])).toBe(false);
    expect(sameStages([stage()], [stage({ args: undefined })])).toBe(false);
    expect(sameStages([stage()], [])).toBe(false);
    expect(sameStages([], [])).toBe(true);
  });
});

describe('sameTrace', () => {
  it('detects content, reasoning and stage changes', () => {
    const a = trace('hello', 'think', [stage()]);
    expect(sameTrace(a, trace('hello', 'think', [stage()]))).toBe(true);
    expect(sameTrace(a, trace('hello!', 'think', [stage()]))).toBe(false);
    expect(sameTrace(a, trace('hello', '', [stage()]))).toBe(false);
    expect(sameTrace(a, trace('hello', 'think', []))).toBe(false);
  });
});

describe('setMetrics', () => {
  beforeEach(() => {
    useLoopMetrics.getState().reset();
  });

  it('skips identical polls without notifying subscribers', () => {
    const { setMetrics } = useLoopMetrics.getState();
    setMetrics({ trace: trace('hello', 'think', [stage()]), tokensIn: 10 });
    let notified = 0;
    const unsubscribe = useLoopMetrics.subscribe(() => {
      notified += 1;
    });
    // Другой объект, то же содержимое — идентичный полл run_usage.
    setMetrics({ trace: trace('hello', 'think', [stage()]), tokensIn: 10 });
    unsubscribe();
    expect(notified).toBe(0);
    expect(useLoopMetrics.getState().trace.content).toBe('hello');
  });

  it('notifies when content grows or stage status flips', () => {
    const { setMetrics } = useLoopMetrics.getState();
    setMetrics({ trace: trace('he', '', [stage({ status: 'running' })]) });
    let notified = 0;
    const unsubscribe = useLoopMetrics.subscribe(() => {
      notified += 1;
    });
    setMetrics({ trace: trace('hello', '', [stage({ status: 'running' })]) });
    setMetrics({ trace: trace('hello', '', [stage({ status: 'done' })]) });
    unsubscribe();
    expect(notified).toBe(2);
  });

  it('keeps sessionId across partial updates', () => {
    const { setMetrics } = useLoopMetrics.getState();
    setMetrics({ sessionId: 's1', status: 'running' });
    setMetrics({ trace: trace('tick') });
    setMetrics({ status: 'done' });
    expect(useLoopMetrics.getState().sessionId).toBe('s1');
  });
});

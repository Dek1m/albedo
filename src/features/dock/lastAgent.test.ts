import { afterEach, describe, expect, it } from 'vitest';
import type { LlmAgent } from '../../api/llmApi';
import { LAST_AGENT_KEY, pickAgentId, readLastAgentId, writeLastAgentId } from './lastAgent';

function agent(partial: Partial<LlmAgent> & Pick<LlmAgent, 'id' | 'name'>): LlmAgent {
  return {
    agentType: 'agent',
    description: '',
    systemPrompt: '',
    model: '',
    avatarUrl: null,
    enabled: true,
    visible: true,
    isDefault: false,
    ...partial,
  };
}

describe('pickAgentId', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('prefers last-used when still visible', () => {
    const list = [agent({ id: 'a', name: 'A', isDefault: true }), agent({ id: 'b', name: 'B' })];
    expect(pickAgentId(list, 'b')).toBe('b');
  });

  it('falls back to default then first', () => {
    const list = [agent({ id: 'a', name: 'A' }), agent({ id: 'b', name: 'B', isDefault: true })];
    expect(pickAgentId(list, 'gone')).toBe('b');
    expect(pickAgentId([agent({ id: 'a', name: 'A' })], null)).toBe('a');
  });

  it('skips disabled and invisible', () => {
    const list = [
      agent({ id: 'x', name: 'X', enabled: false }),
      agent({ id: 'y', name: 'Y', visible: false }),
      agent({ id: 'z', name: 'Z' }),
    ];
    expect(pickAgentId(list, 'x')).toBe('z');
  });

  it('roundtrips last agent id', () => {
    writeLastAgentId('ag-1');
    expect(readLastAgentId()).toBe('ag-1');
    expect(localStorage.getItem(LAST_AGENT_KEY)).toBe('ag-1');
  });
});

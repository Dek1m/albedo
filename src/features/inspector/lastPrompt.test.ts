import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../domain/workspace';
import { buildLastPrompt } from './lastPrompt';

function msg(role: string, content: string): ChatMessage {
  return {
    id: `${role}-${content.length}-${content.slice(0, 4)}`,
    sessionId: 's1' as ChatMessage['sessionId'],
    kind: 'text',
    role,
    content,
    createdAt: '2026-09-06T10:00:00Z',
    agentName: role === 'assistant' ? 'Bot' : null,
    modelName: role === 'assistant' ? 'gpt-4o' : null,
    parentId: null,
    reasoning: null,
    stages: [],
  };
}

describe('buildLastPrompt', () => {
  it('returns empty string without user messages', () => {
    expect(buildLastPrompt([msg('assistant', 'hi')], 'sys')).toBe('');
    expect(buildLastPrompt([], null)).toBe('');
  });

  it('cuts the tail after the last user message', () => {
    const thread = [msg('user', 'q1'), msg('assistant', 'a1'), msg('user', 'q2'), msg('assistant', 'a2')];
    const out = buildLastPrompt(thread, null);
    expect(out).toContain('[user]\nq1');
    expect(out).toContain('[assistant]\na1');
    expect(out).toContain('[user]\nq2');
    expect(out).not.toContain('a2');
    expect(out.endsWith('q2')).toBe(true);
  });

  it('prepends the system prompt block first', () => {
    const out = buildLastPrompt([msg('user', 'q')], 'be brief');
    expect(out.startsWith('[system]\nbe brief')).toBe(true);
    expect(out).toContain('[user]\nq');
  });

  it('omits empty system prompt block', () => {
    const out = buildLastPrompt([msg('user', 'q')], '   ');
    expect(out.startsWith('[user]')).toBe(true);
  });

  it('skips messages with empty content', () => {
    const thread = [msg('user', 'q'), { ...msg('assistant', ''), role: 'assistant' }];
    const out = buildLastPrompt([...thread, msg('user', 'q2')], null);
    expect(out).not.toContain('[assistant]');
    expect((out.match(/\[user\]/g) ?? []).length).toBe(2);
  });
});

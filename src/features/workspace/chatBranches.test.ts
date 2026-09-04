import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../domain/workspace';
import { asSessionId } from '../../domain/workspace';
import { siblingsOf, visiblePath, withParents } from './chatBranches';

function msg(id: string, createdAt: string, parentId: string | null = null): ChatMessage {
  return {
    id,
    sessionId: asSessionId('s'),
    kind: 'message',
    role: 'user',
    content: id,
    createdAt,
    agentName: null,
    modelName: null,
    parentId,
  };
}

describe('chatBranches', () => {
  it('chains legacy messages by time', () => {
    const a = msg('a', '2026-01-01T00:00:00Z');
    const b = msg('b', '2026-01-01T00:01:00Z');
    const linked = withParents([b, a]);
    expect(linked.find((item) => item.id === 'a')?.parentId).toBeNull();
    expect(linked.find((item) => item.id === 'b')?.parentId).toBe('a');
  });

  it('keeps assistant reply under the latest user', () => {
    const u1 = msg('u1', '2026-01-01T00:00:00Z', null);
    const a1 = { ...msg('a1', '2026-01-01T00:01:00Z', 'u1'), role: 'assistant' as const };
    const u2 = msg('u2', '2026-01-01T00:02:00Z', 'a1');
    const a2 = { ...msg('a2', '2026-01-01T00:03:00Z', 'u2'), role: 'assistant' as const };
    const path = visiblePath([u1, a1, u2, a2], { '': 'u1', a1: 'u2' });
    expect(path.map((item) => item.id)).toEqual(['u1', 'a1', 'u2', 'a2']);
  });

  it('picks a sibling branch', () => {
    const root = msg('r', '2026-01-01T00:00:00Z', null);
    const left = msg('l', '2026-01-01T00:01:00Z', 'r');
    const right = msg('x', '2026-01-01T00:02:00Z', 'r');
    const path = visiblePath([root, left, right], { r: 'l' });
    expect(path.map((item) => item.id)).toEqual(['r', 'l']);
    expect(siblingsOf(withParents([root, left, right]), left)).toHaveLength(2);
  });
});

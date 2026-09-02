import { describe, expect, it, vi } from 'vitest';
import { DomainUserMenu } from './DomainUserMenu';

describe('DomainUserMenu', () => {
  const menu = new DomainUserMenu({ onRename: vi.fn(), onDelete: vi.fn() });

  it('offers rename without disabled flag', () => {
    const items = menu.items({
      id: 'u1',
      username: 'alice',
      workspaceDb: 'belle_workspace_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      email: '',
    });
    expect(items.map((item) => item.id)).toEqual(['rename', 'delete']);
    expect(items[0]?.disabled).toBeFalsy();
  });
});

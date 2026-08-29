import { describe, expect, it, vi } from 'vitest';
import { DomainGroupMenu } from './DomainGroupMenu';

describe('DomainGroupMenu', () => {
  const menu = new DomainGroupMenu({ onRename: vi.fn() });

  it('disables rename for builtin groups', () => {
    const items = menu.items({ id: '1', name: 'admins', isBuiltin: true });
    expect(items[0]?.disabled).toBe(true);
  });

  it('allows rename for ordinary groups', () => {
    const items = menu.items({ id: '2', name: 'sales', isBuiltin: false });
    expect(items[0]?.disabled).toBeFalsy();
  });
});

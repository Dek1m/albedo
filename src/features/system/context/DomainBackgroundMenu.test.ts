import { describe, expect, it, vi } from 'vitest';
import { DomainBackgroundMenu } from './DomainBackgroundMenu';

describe('DomainBackgroundMenu', () => {
  it('offers Create domain when allowed', () => {
    const onCreateDomain = vi.fn();
    const menu = new DomainBackgroundMenu({ canCreateDomain: true, onCreateDomain });
    const [item] = menu.items();
    if (!item) {
      throw new Error('menu item missing');
    }
    expect(item.id).toBe('create-domain');
    expect(item.label).toBe('Create domain');
    expect(item.disabled).toBeFalsy();
    item.action?.();
    expect(onCreateDomain).toHaveBeenCalledOnce();
  });

  it('disables Create domain without the right', () => {
    const menu = new DomainBackgroundMenu({ canCreateDomain: false, onCreateDomain: vi.fn() });
    const [item] = menu.items();
    if (!item) {
      throw new Error('menu item missing');
    }
    expect(item.disabled).toBe(true);
  });

  it('treats missing canCreateDomain as allowed (право проверяет вызывающий)', () => {
    const menu = new DomainBackgroundMenu({ onCreateDomain: vi.fn() });
    const [item] = menu.items();
    if (!item) {
      throw new Error('menu item missing');
    }
    expect(item.disabled).toBeFalsy();
  });
});

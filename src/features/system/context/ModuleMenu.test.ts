import { describe, expect, it, vi } from 'vitest';
import type { SystemModule } from '../../../api/systemApi';
import { ModuleMenu } from './ModuleMenu';

function mod(partial: Partial<SystemModule> & Pick<SystemModule, 'name'>): SystemModule {
  return {
    name: partial.name,
    displayName: partial.displayName ?? partial.name,
    version: partial.version ?? '1.0.0',
    status: partial.status ?? 'loaded',
    health: partial.health ?? 'ok',
    isSystem: partial.isSystem ?? false,
    services: partial.services ?? {},
  };
}

function byId(items: ReturnType<ModuleMenu['items']>, id: string) {
  return items.find((item) => item.id === id);
}

describe('ModuleMenu', () => {
  const actions = {
    onReload: vi.fn(),
    onUpdate: vi.fn(),
    onUnload: vi.fn(),
    onDisable: vi.fn(),
    onEnable: vi.fn(),
    onDelete: vi.fn(),
  };
  const menu = new ModuleMenu(actions);

  it('lists reload update unload disable delete', () => {
    const items = menu.items(mod({ name: 'fs', isSystem: false }));
    expect(items.map((item) => item.id)).toEqual(['reload', 'update', 'unload', 'disable', 'delete']);
    expect(byId(items, 'enable')).toBeUndefined();
  });

  it('adds Enable when status is disabled', () => {
    const items = menu.items(mod({ name: 'fs', status: 'disabled', isSystem: false }));
    expect(items.map((item) => item.id)).toEqual([
      'reload',
      'update',
      'unload',
      'disable',
      'enable',
      'delete',
    ]);
    expect(byId(items, 'enable')?.disabled).toBeFalsy();
  });

  it('disables unload disable delete on system modules, keeps update', () => {
    const items = menu.items(mod({ name: 'auth', isSystem: true }));
    expect(byId(items, 'reload')?.disabled).toBeFalsy();
    expect(byId(items, 'update')?.disabled).toBeFalsy();
    expect(byId(items, 'unload')?.disabled).toBe(true);
    expect(byId(items, 'disable')?.disabled).toBe(true);
    expect(byId(items, 'delete')?.disabled).toBe(true);
  });
});

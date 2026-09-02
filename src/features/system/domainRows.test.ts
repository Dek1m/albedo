import { describe, expect, it } from 'vitest';
import type { DomainOu } from '../../api/systemApi';
import { allRows, filterRows, folderRows, userRow, visibleRows } from './domainRows';

function ou(partial: Partial<DomainOu> & Pick<DomainOu, 'id' | 'name'>): DomainOu {
  return {
    parentId: null,
    kind: 'folder',
    isSystem: false,
    isBuiltin: false,
    sortOrder: 0,
    children: [],
    users: [],
    groups: [],
    ...partial,
  };
}

const sales = ou({
  id: 'ou-sales',
  name: 'Sales',
  isBuiltin: true,
  children: [ou({ id: 'ou-eu', name: 'EU' })],
  users: [{ id: 'u-1', username: 'Ada', workspaceDb: 'ws_ada', email: 'ada@ex.com' }],
  groups: [{ id: 'g-1', name: 'Ops', isBuiltin: false }],
});

describe('domainRows filter', () => {
  const rows = folderRows(sales);

  it('Any matches every row field', () => {
    expect(filterRows(rows, 'any', 'ADA').map((row) => row.type)).toEqual(['user']);
    expect(filterRows(rows, 'any', 'ou-eu').map((row) => row.name)).toEqual(['EU']);
    expect(filterRows(rows, 'any', 'group').map((row) => row.type)).toEqual(['group']);
    expect(filterRows(allRows([sales]), 'any', 'builtin').map((row) => row.name)).toEqual(['Sales']);
  });

  it('named field matches only that column', () => {
    expect(filterRows(rows, 'email', 'ada@ex.com')).toHaveLength(1);
    expect(filterRows(rows, 'email', 'Sales')).toHaveLength(0);
    expect(filterRows(rows, 'workspace', 'ws_ada').map((row) => row.type)).toEqual(['user']);
    expect(filterRows(rows, 'type', 'ou').map((row) => row.name)).toEqual(['EU']);
    expect(filterRows(rows, 'uuid', 'g-1').map((row) => row.name)).toEqual(['Ops']);
    expect(filterRows(rows, 'name', 'eu').map((row) => row.id)).toEqual(['ou-eu']);
  });

  it('non-empty query searches the whole tree, empty query is the folder', () => {
    const tree = [ou({ id: 'root', name: 'Argenta', children: [sales] })];
    expect(visibleRows(tree, 'root', 'any', '').map((row) => row.name)).toEqual(['Sales']);
    expect(visibleRows(tree, 'root', 'name', 'ada').map((row) => row.name)).toEqual(['Ada']);
  });
});

describe('userRow extra', () => {
  it('puts workspace_db into Extra', () => {
    expect(userRow({ id: 'u', username: 'n', workspaceDb: 'ws', email: '' }).extra).toBe('ws');
  });
});

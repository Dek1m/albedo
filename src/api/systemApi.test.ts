import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ apiClient: { call: vi.fn() } }));

import { apiClient } from './client';
import { systemApi } from './systemApi';

const call = vi.mocked(apiClient.call);

beforeEach(() => {
  call.mockReset();
});

describe('systemApi caps', () => {
  it('maps domains_create flag', async () => {
    call.mockResolvedValueOnce({
      users_update: false,
      groups_create: false,
      groups_update: false,
      roles_update: false,
      domains_create: true,
    });
    const caps = await systemApi.caps();
    expect(caps.domainsCreate).toBe(true);
    expect(caps.usersUpdate).toBe(false);
  });

  it('defaults domainsCreate to false when backend is older', async () => {
    call.mockResolvedValueOnce({ users_update: true });
    const caps = await systemApi.caps();
    expect(caps.domainsCreate).toBe(false);
    expect(caps.usersUpdate).toBe(true);
  });
});

describe('systemApi domainTree', () => {
  it('maps root and domain kinds instead of falling back to folder', async () => {
    call.mockResolvedValueOnce([
      { id: 'ou-root', name: 'Root', kind: 'root', is_system: true, is_builtin: true },
      { id: 'ou-dom', name: 'acme', kind: 'domain', is_system: true, parent_id: 'ou-root' },
    ]);
    const tree = await systemApi.domainTree();
    // Плоский список с parent_id вкладывается: domain под root
    expect(tree[0]?.kind).toBe('root');
    expect(tree[0]?.children[0]?.kind).toBe('domain');
  });

  it('keeps folder fallback for unknown kinds', async () => {
    call.mockResolvedValueOnce([{ id: 'ou-x', name: 'X', kind: 'mystery' }]);
    const tree = await systemApi.domainTree();
    expect(tree[0]?.kind).toBe('folder');
  });

  it('maps additive domain_id/domain_display_name on domain nodes', async () => {
    call.mockResolvedValueOnce([
      {
        id: 'ou-dom',
        name: 'acme',
        kind: 'domain',
        domain_id: 'dom-1',
        domain_display_name: 'Acme Corp',
        children: [],
        users: [],
        groups: [],
      },
    ]);
    const tree = await systemApi.domainTree();
    expect(tree[0]?.domainId).toBe('dom-1');
    expect(tree[0]?.domainDisplayName).toBe('Acme Corp');
  });

  it('leaves domain fields undefined on plain folders', async () => {
    call.mockResolvedValueOnce([{ id: 'ou-f', name: 'F', kind: 'folder', children: [], users: [], groups: [] }]);
    const tree = await systemApi.domainTree();
    expect(tree[0]?.domainId).toBeUndefined();
    expect(tree[0]?.domainDisplayName).toBeUndefined();
  });
});

describe('systemApi domains', () => {
  it('listDomains maps items', async () => {
    call.mockResolvedValueOnce({
      items: [
        { id: 'dom-1', name: 'acme', display_name: 'Acme Corp', kind: 'domain', status: 'active', root_ou_id: 'ou-1' },
      ],
    });
    const domains = await systemApi.listDomains();
    expect(call).toHaveBeenCalledWith('system', 'list_domains', {});
    expect(domains).toEqual([
      { id: 'dom-1', name: 'acme', displayName: 'Acme Corp', kind: 'domain', status: 'active', rootOuId: 'ou-1' },
    ]);
  });

  it('createDomain sends snake_case payload and maps response', async () => {
    call.mockResolvedValueOnce({
      id: 'dom-2',
      name: 'globex',
      display_name: 'Globex',
      kind: 'domain',
      status: 'active',
      root_ou_id: 'ou-9',
    });
    const domain = await systemApi.createDomain('globex', 'Globex');
    expect(call).toHaveBeenCalledWith('system', 'create_domain', { name: 'globex', display_name: 'Globex' });
    expect(domain.rootOuId).toBe('ou-9');
  });

  it('createDomain throws on malformed response', async () => {
    call.mockResolvedValueOnce(null);
    await expect(systemApi.createDomain('x', 'X')).rejects.toThrow('Malformed domain response');
  });
});

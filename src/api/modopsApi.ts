import { apiClient } from './client';

export interface SystemModuleService {
  status: string;
  health: string;
  pid: number | null;
  error: string | null;
}

export interface SystemModuleServices {
  belle?: SystemModuleService;
  worker?: SystemModuleService;
}

export interface SystemModule {
  name: string;
  displayName: string;
  version: string;
  status: string;
  health: string;
  isSystem: boolean;
  services: SystemModuleServices;
}

export interface ModuleUpdateCheck {
  name: string;
  currentSha: string;
  remoteSha: string;
  currentLabel: string;
  remoteLabel: string;
  updateAvailable: boolean;
}

export interface ModuleUpdateResult {
  name: string;
  sha: string;
  version: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

function pickBool(row: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return false;
}

function pickList(row: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function pickPid(row: Record<string, unknown>): number | null {
  const value = row.pid;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return Number(value);
  }
  return null;
}

function mapService(raw: unknown): SystemModuleService | undefined {
  const row = asRecord(raw);
  if (!row) {
    return undefined;
  }
  const error = row.error;
  return {
    status: pickStr(row, 'status') || 'unknown',
    health: pickStr(row, 'health') || 'unknown',
    pid: pickPid(row),
    error: typeof error === 'string' && error ? error : null,
  };
}

function mapServices(raw: unknown): SystemModuleServices {
  const row = asRecord(raw);
  if (!row) {
    return {};
  }
  const belle = mapService(row.belle);
  const worker = mapService(row.worker) ?? mapService(row['belle-worker']);
  return {
    ...(belle ? { belle } : {}),
    ...(worker ? { worker } : {}),
  };
}

function rollupStatus(services: SystemModuleServices, explicit: string): string {
  if (explicit) {
    return explicit;
  }
  const all = [services.belle?.status, services.worker?.status].filter(Boolean);
  if (all.includes('failed')) {
    return 'failed';
  }
  if (all.includes('loaded')) {
    return 'loaded';
  }
  if (all.includes('disabled')) {
    return 'disabled';
  }
  if (all.includes('unloaded')) {
    return 'unloaded';
  }
  return all[0] ?? 'unknown';
}

function rollupHealth(services: SystemModuleServices, explicit: string): string {
  if (explicit) {
    return explicit;
  }
  const all = [services.belle?.health, services.worker?.health].filter(Boolean);
  if (all.includes('degraded')) {
    return 'degraded';
  }
  if (all.includes('ok')) {
    return 'ok';
  }
  return all[0] ?? 'unknown';
}

function mapModule(raw: unknown): SystemModule | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const name = pickStr(row, 'name');
  if (!name) {
    return null;
  }
  const services = mapServices(row.services);
  return {
    name,
    displayName: pickStr(row, 'display_name', 'displayName'),
    version: pickStr(row, 'version'),
    status: rollupStatus(services, pickStr(row, 'status')),
    health: rollupHealth(services, pickStr(row, 'health')),
    isSystem: pickBool(row, 'is_system', 'isSystem'),
    services,
  };
}

export const modopsApi = {
  async list(): Promise<SystemModule[]> {
    const raw = await apiClient.call<unknown>('modops', 'list', {});
    const list = Array.isArray(raw) ? raw : pickList(asRecord(raw) ?? {}, 'items', 'modules');
    return list.map(mapModule).filter((item): item is SystemModule => item !== null);
  },

  async reload(name: string): Promise<void> {
    await apiClient.call('modops', 'reload', { name });
  },

  async checkUpdate(name: string): Promise<ModuleUpdateCheck> {
    const raw = await apiClient.call<unknown>('modops', 'check_update', { name });
    const row = asRecord(raw) ?? {};
    return {
      name: pickStr(row, 'name') || name,
      currentSha: pickStr(row, 'current_sha', 'currentSha'),
      remoteSha: pickStr(row, 'remote_sha', 'remoteSha'),
      currentLabel: pickStr(row, 'current_label', 'currentLabel'),
      remoteLabel: pickStr(row, 'remote_label', 'remoteLabel'),
      updateAvailable: pickBool(row, 'update_available', 'updateAvailable'),
    };
  },

  async update(name: string): Promise<ModuleUpdateResult> {
    const raw = await apiClient.call<unknown>('modops', 'update', { name });
    const row = asRecord(raw) ?? {};
    return {
      name: pickStr(row, 'name') || name,
      sha: pickStr(row, 'sha'),
      version: pickStr(row, 'version'),
    };
  },

  async unload(name: string): Promise<void> {
    await apiClient.call('modops', 'unload', { name });
  },

  async disable(name: string): Promise<void> {
    await apiClient.call('modops', 'disable', { name });
  },

  async enable(name: string): Promise<void> {
    await apiClient.call('modops', 'enable', { name });
  },

  async delete(name: string): Promise<void> {
    await apiClient.call('modops', 'delete', { name });
  },
};

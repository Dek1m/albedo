export const ROLE_MODULES = [
  {
    id: 'llm',
    label: 'LLM',
    entities: [
      { id: 'providers', label: 'Providers', shift: 0 },
      { id: 'share', label: 'Share', shift: 12 },
    ],
  },
  {
    id: 'auth',
    label: 'Auth',
    entities: [
      { id: 'users', label: 'Users', shift: 4 },
      { id: 'groups', label: 'Groups', shift: 8 },
    ],
  },
] as const;

export const CRUD = ['C', 'R', 'U', 'D'] as const;

export type RoleModuleId = (typeof ROLE_MODULES)[number]['id'];

export function bitOn(mask: number, bit: number): boolean {
  return (mask & (1 << bit)) !== 0;
}

export function toggleBit(mask: number, bit: number): number {
  return mask ^ (1 << bit);
}

export function moduleBits(moduleId: RoleModuleId): number {
  const module = ROLE_MODULES.find((item) => item.id === moduleId);
  if (!module) {
    return 0;
  }
  let bits = 0;
  for (const entity of module.entities) {
    bits |= 0xf << entity.shift;
  }
  return bits;
}

export function entitiesForModules(modules: Set<string>): { id: string; label: string; shift: number }[] {
  const items: { id: string; label: string; shift: number }[] = [];
  for (const module of ROLE_MODULES) {
    if (!modules.has(module.id)) {
      continue;
    }
    for (const entity of module.entities) {
      items.push({ id: entity.id, label: entity.label, shift: entity.shift });
    }
  }
  return items;
}

export function maskForModules(mask: number, modules: Set<string>): number {
  let next = 0;
  for (const module of ROLE_MODULES) {
    if (modules.has(module.id)) {
      next |= mask & moduleBits(module.id);
    }
  }
  return next;
}

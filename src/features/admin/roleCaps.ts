export const ROLE_MODULES = [
  {
    id: 'llm',
    label: 'LLM',
    entities: [{ label: 'Providers', shift: 0 }],
  },
  {
    id: 'auth',
    label: 'Auth',
    entities: [
      { label: 'Users', shift: 4 },
      { label: 'Groups', shift: 8 },
    ],
  },
] as const;

export const CRUD = ['C', 'R', 'U', 'D'] as const;

export function bitOn(mask: number, bit: number): boolean {
  return (mask & (1 << bit)) !== 0;
}

export function toggleBit(mask: number, bit: number): number {
  return mask ^ (1 << bit);
}

export function moduleBits(moduleId: (typeof ROLE_MODULES)[number]['id']): number {
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

export function modulesFromMask(mask: number): Set<string> {
  const picked = new Set<string>();
  for (const module of ROLE_MODULES) {
    if (mask & moduleBits(module.id)) {
      picked.add(module.id);
    }
  }
  return picked.size ? picked : new Set(ROLE_MODULES.map((item) => item.id));
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

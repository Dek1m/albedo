export type DomainSelection =
  | { type: 'ou'; id: string }
  | { type: 'user'; id: string }
  | { type: 'group'; id: string; name: string }
  | { type: 'create-user'; id: string; ouId: string }
  | { type: 'create-group'; id: string; ouId: string };

import { apiClient } from './client';

export type ShareLevel = 'viewer' | 'editor';
export type GranteeType = 'user' | 'group';
export type ResolveStatus = 'resolved' | 'unresolved' | 'ambiguous';

export interface ShareGrantee {
  type: GranteeType;
  id: string;
  name: string;
  active: boolean;
  level: ShareLevel;
  createdAt: string | null;
}

export interface ShareSkip {
  type: GranteeType;
  id: string;
  name: string;
  reason: string;
}

export interface EntityCandidate {
  type: GranteeType;
  uuid: string;
  name: string;
  email: string | null;
}

export interface ResolveResult {
  input: string;
  status: ResolveStatus;
  candidates: EntityCandidate[];
}

interface GranteeDto {
  grantee_type?: string;
  type?: string;
  grantee_id?: string;
  uuid?: string;
  id?: string;
  name?: string;
  active?: boolean;
  level?: string;
  created_at?: string;
  reason?: string;
}

interface CandidateDto {
  type?: string;
  uuid?: string;
  name?: string;
  email?: string | null;
}

interface ResolveDto {
  input?: string;
  status?: string;
  candidates?: CandidateDto[];
}

function asType(value: string | undefined): GranteeType {
  return value === 'group' ? 'group' : 'user';
}

function asLevel(value: string | undefined): ShareLevel {
  return value === 'editor' ? 'editor' : 'viewer';
}

function mapGrantee(dto: GranteeDto): ShareGrantee {
  return {
    type: asType(dto.grantee_type ?? dto.type),
    id: dto.grantee_id ?? dto.uuid ?? dto.id ?? '',
    name: dto.name ?? '',
    active: dto.active !== false,
    level: asLevel(dto.level),
    createdAt: dto.created_at ?? null,
  };
}

function mapSkip(dto: GranteeDto): ShareSkip {
  return {
    type: asType(dto.grantee_type ?? dto.type),
    id: dto.grantee_id ?? dto.uuid ?? dto.id ?? '',
    name: dto.name ?? '',
    reason: dto.reason ?? '',
  };
}

function mapCandidate(dto: CandidateDto): EntityCandidate {
  return {
    type: asType(dto.type),
    uuid: dto.uuid ?? '',
    name: dto.name ?? '',
    email: dto.email ?? null,
  };
}

function mapResolve(dto: ResolveDto): ResolveResult {
  const status: ResolveStatus =
    dto.status === 'ambiguous' || dto.status === 'unresolved' ? dto.status : 'resolved';
  return {
    input: dto.input ?? '',
    status,
    candidates: (dto.candidates ?? []).map(mapCandidate),
  };
}

export const fsApi = {
  async shareList(path: string): Promise<ShareGrantee[]> {
    const result = await apiClient.call<{ items?: GranteeDto[]; grantees?: GranteeDto[] }>(
      'fs',
      'share_list',
      { path },
    );
    return (result.items ?? result.grantees ?? []).map(mapGrantee);
  },

  async shareAdd(
    path: string,
    grantees: { type: GranteeType; id: string }[],
    level: ShareLevel,
  ): Promise<{ added: ShareGrantee[]; skipped: ShareSkip[] }> {
    const result = await apiClient.call<{ added?: GranteeDto[]; skipped?: GranteeDto[] }>(
      'fs',
      'share_add',
      { path, grantees, level },
    );
    return {
      added: (result.added ?? []).map(mapGrantee),
      skipped: (result.skipped ?? []).map(mapSkip),
    };
  },

  async shareRemove(path: string, granteeType: GranteeType, granteeId: string): Promise<boolean> {
    const result = await apiClient.call<{ removed?: boolean }>('fs', 'share_remove', {
      path,
      grantee_type: granteeType,
      grantee_id: granteeId,
    });
    return Boolean(result.removed);
  },

  async resolveEntities(inputs: string[]): Promise<ResolveResult[]> {
    const result = await apiClient.call<{ results?: ResolveDto[] }>('fs', 'resolve_entities', {
      inputs,
    });
    return (result.results ?? []).map(mapResolve);
  },
};

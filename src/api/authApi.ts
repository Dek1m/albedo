import type { Group } from '../domain/group';
import { asGroupId } from '../domain/group';
import type { Profile } from '../domain/user';
import { asUserId } from '../domain/user';
import { apiClient } from './client';
import type { GroupDto, GroupListDto, ProfileDto, UpdateMePayload } from './types';

export interface SessionUser {
  user_id: string;
  username: string;
}

export interface BootstrapPayload {
  username: string;
  password: string;
  email?: string;
}

function toProfile(dto: ProfileDto): Profile {
  return {
    id: asUserId(dto.user_id),
    username: dto.username,
    nickname: dto.nickname,
    firstName: dto.first_name,
    lastName: dto.last_name,
    email: dto.email,
    phone: dto.phone,
    avatarUrl: dto.avatar_url,
    userPrompt: dto.user_prompt,
    chipDisplayMode: dto.chip_display_mode,
    isSuperadmin: dto.is_superadmin,
    isBootstrapAdmin: dto.is_bootstrap_admin,
    primaryGroupId: dto.primary_group_id ? asGroupId(dto.primary_group_id) : null,
  };
}

function toGroup(dto: GroupDto): Group {
  return {
    id: asGroupId(dto.id),
    name: dto.name,
    description: dto.description,
    isBuiltin: dto.is_builtin,
    isPrimary: Boolean(dto.is_primary),
  };
}

export const authApi = {
  needsBootstrap(): Promise<boolean> {
    return apiClient.call<boolean>('auth', 'needs_bootstrap', {}, { skipRefresh: true });
  },

  bootstrap(payload: BootstrapPayload): Promise<SessionUser> {
    return apiClient.call<SessionUser>('auth', 'bootstrap', payload, { skipRefresh: true });
  },

  login(username: string, password: string): Promise<SessionUser> {
    return apiClient.call<SessionUser>(
      'auth',
      'login',
      { username, password },
      { skipRefresh: true },
    );
  },

  refresh(): Promise<SessionUser> {
    return apiClient.call<SessionUser>('auth', 'refresh_token', {}, { skipRefresh: true });
  },

  logout(): Promise<boolean> {
    return apiClient.call<boolean>('auth', 'logout', {}, { skipRefresh: true });
  },

  async getMe(): Promise<Profile> {
    const dto = await apiClient.call<ProfileDto>('auth', 'get_me', {});
    return toProfile(dto);
  },

  async updateMe(payload: UpdateMePayload): Promise<Profile> {
    const dto = await apiClient.call<ProfileDto>('auth', 'update_me', payload);
    return toProfile(dto);
  },

  async changeUsername(newUsername: string, password: string): Promise<Profile> {
    const dto = await apiClient.call<ProfileDto>('auth', 'change_username', {
      new_username: newUsername,
      password,
    });
    return toProfile(dto);
  },

  setAvatar(imageB64: string, contentType: string): Promise<{ avatar_url: string }> {
    return apiClient.call('auth', 'set_avatar', {
      image_b64: imageB64,
      content_type: contentType,
    });
  },

  async clearAvatar(): Promise<Profile> {
    const dto = await apiClient.call<ProfileDto>('auth', 'clear_avatar', {});
    return toProfile(dto);
  },

  async getMyGroups(): Promise<Group[]> {
    const items = await apiClient.call<GroupDto[]>('auth', 'get_my_groups', {});
    return items.map(toGroup);
  },

  async listGroups(): Promise<Group[]> {
    const result = await apiClient.call<GroupListDto>('auth', 'list_groups', {
      offset: 0,
      limit: 200,
    });
    return result.items.map(toGroup);
  },

  addToGroup(groupId: string): Promise<unknown> {
    return apiClient.call('auth', 'add_user_to_group', { group_id: groupId });
  },

  removeFromGroup(groupId: string): Promise<unknown> {
    return apiClient.call('auth', 'remove_user_from_group', { group_id: groupId });
  },
};

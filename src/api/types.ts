export type ChipDisplayModeDto = 'nickname' | 'full_name';

export interface ProfileDto {
  user_id: string;
  username: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  user_prompt: string | null;
  chip_display_mode: ChipDisplayModeDto;
  is_superadmin: boolean;
  is_bootstrap_admin: boolean;
  primary_group_id: string | null;
}

export interface GroupDto {
  id: string;
  name: string;
  description: string | null;
  is_builtin: boolean;
  is_primary?: boolean;
}

export interface GroupListDto {
  items: GroupDto[];
  total: number;
}

export interface UpdateMePayload {
  nickname?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  user_prompt?: string | null;
  chip_display_mode?: ChipDisplayModeDto;
}

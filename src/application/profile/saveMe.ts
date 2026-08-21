import { authApi } from '../../api/authApi';
import type { UpdateMePayload } from '../../api/types';
import { useAuthStore } from '../../auth/AuthStore';
import type { Profile } from '../../domain/user';

export async function saveMe(payload: UpdateMePayload): Promise<Profile> {
  const profile = await authApi.updateMe(payload);
  useAuthStore.getState().setProfile(profile);
  return profile;
}

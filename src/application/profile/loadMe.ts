import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../auth/AuthStore';
import type { Profile } from '../../domain/user';

export async function loadMe(): Promise<Profile> {
  const profile = await authApi.getMe();
  useAuthStore.getState().markAuthenticated(profile);
  return profile;
}

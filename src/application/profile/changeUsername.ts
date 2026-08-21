import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../auth/AuthStore';
import type { Profile } from '../../domain/user';

export async function changeUsername(newUsername: string, password: string): Promise<Profile> {
  const profile = await authApi.changeUsername(newUsername, password);
  useAuthStore.getState().setProfile(profile);
  return profile;
}

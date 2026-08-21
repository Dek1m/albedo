import { authApi } from '../../api/authApi';
import type { Group } from '../../domain/group';

export function loadMyGroups(): Promise<Group[]> {
  return authApi.getMyGroups();
}

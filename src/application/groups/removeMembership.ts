import { authApi } from '../../api/authApi';

export function removeMembership(groupId: string): Promise<unknown> {
  return authApi.removeFromGroup(groupId);
}

import { authApi } from '../../api/authApi';

export function addMembership(groupId: string): Promise<unknown> {
  return authApi.addToGroup(groupId);
}

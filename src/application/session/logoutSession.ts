import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../auth/AuthStore';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';

export async function logoutSession(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // cookie уже мёртвая — всё равно чистим клиент
  }
  useAuthStore.getState().clearSession();
  useWorkspaceStore.getState().reset();
}

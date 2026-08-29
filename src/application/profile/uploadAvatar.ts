import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../auth/AuthStore';

const MAX_BYTES = 256 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadAvatar(file: File): Promise<void> {
  if (!ALLOWED.has(file.type) || file.type === 'image/svg+xml') {
    throw new Error('JPEG, PNG or WebP only');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Avatar must be 256 KiB or smaller');
  }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const imageB64 = btoa(binary);
  const result = await authApi.setAvatar(imageB64, file.type);
  const current = useAuthStore.getState().profile;
  if (current) {
    useAuthStore.getState().setProfile({
      ...current,
      avatarUrl: `${result.avatar_url}?t=${String(Date.now())}`,
    });
  }
}

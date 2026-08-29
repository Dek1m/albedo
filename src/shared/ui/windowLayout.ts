import { authApi } from '../../api/authApi';
import type { WindowRatio } from './windowGeom';

const cache = new Map<string, WindowRatio>();

export async function loadWindowLayouts(): Promise<void> {
  try {
    const items = await authApi.getWindows();
    cache.clear();
    for (const [id, ratio] of Object.entries(items)) {
      cache.set(id, ratio);
    }
  } catch {
    /* окно всё равно откроется с дефолтом 20% */
  }
}

export function peekWindow(windowId: string): WindowRatio | null {
  return cache.get(windowId) ?? null;
}

export function rememberWindow(windowId: string, ratio: WindowRatio): void {
  cache.set(windowId, ratio);
  void authApi.saveWindow(windowId, ratio).catch(() => undefined);
}

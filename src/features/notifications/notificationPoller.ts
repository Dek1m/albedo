import { notificationApi } from '../../api/notificationApi';
import { toast } from '../../shared/toast/toastStore';
import { formatNotificationText } from './notificationText';
import { useNotificationStore } from './notificationStore';

const POLL_MS = 30_000;
const TOAST_CAP = 10;
const toastedIds = new Set<string>();

let lastCount = 0;
let timer: number | null = null;
let started = 0;
let soundUnlocked = false;

function unlockSound(): void {
  if (soundUnlocked) {
    return;
  }
  soundUnlocked = true;
  const audio = new Audio('/notification.ogg');
  audio.volume = 0;
  void audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
    })
    .catch(() => undefined);
}

function playSound(): void {
  if (!soundUnlocked) {
    return;
  }
  const audio = new Audio('/notification.ogg');
  audio.volume = 0.35;
  void audio.play().catch(() => undefined);
}

function showToasts(items: { id: string; type: string; payload: Record<string, unknown> }[]): void {
  const fresh = items.filter((item) => !toastedIds.has(item.id));
  for (const item of fresh) {
    toastedIds.add(item.id);
  }
  if (!fresh.length) {
    return;
  }
  if (fresh.some((item) => item.type === 'share_grant')) {
    playSound();
  }
  const shown = fresh.slice(0, TOAST_CAP);
  for (const item of shown) {
    toast(formatNotificationText(item.type, item.payload), 'info');
  }
  if (fresh.length > TOAST_CAP) {
    toast(`+${fresh.length - TOAST_CAP} уведомлений`, 'info');
  }
}

async function tick(): Promise<void> {
  if (document.hidden) {
    return;
  }
  try {
    const count = await notificationApi.unreadCount();
    const prev = lastCount;
    lastCount = count;
    useNotificationStore.getState().setUnreadCount(count);
    if (count <= 0) {
      return;
    }
    if (count <= prev && toastedIds.size > 0) {
      return;
    }
    const page = await notificationApi.list(TOAST_CAP);
    useNotificationStore.getState().prepend(page.items);
    showToasts(page.items);
  } catch {
    /* поллинг не спамит тостами ошибок */
  }
}

function onVisibility(): void {
  if (!document.hidden) {
    void tick();
  }
}

export function startNotificationPoller(): () => void {
  started += 1;
  if (started === 1) {
    document.addEventListener('pointerdown', unlockSound, { once: true });
    document.addEventListener('keydown', unlockSound, { once: true });
    document.addEventListener('visibilitychange', onVisibility);
    void tick();
    timer = window.setInterval(() => {
      void tick();
    }, POLL_MS);
  }
  return () => {
    started -= 1;
    if (started > 0) {
      return;
    }
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    document.removeEventListener('pointerdown', unlockSound);
    document.removeEventListener('keydown', unlockSound);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

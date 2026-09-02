import { create } from 'zustand';
import type { NotificationItem } from '../../api/notificationApi';

interface NotificationState {
  unreadCount: number;
  items: NotificationItem[];
  nextCursor: string | null;
  setUnreadCount: (count: number) => void;
  replacePage: (items: NotificationItem[], nextCursor: string | null) => void;
  appendPage: (items: NotificationItem[], nextCursor: string | null) => void;
  prepend: (items: NotificationItem[]) => void;
  markReadLocal: (id: string) => void;
  markAllReadLocal: () => void;
}

function withoutDupes(base: NotificationItem[], incoming: NotificationItem[]): NotificationItem[] {
  const seen = new Set(base.map((item) => item.id));
  return incoming.filter((item) => !seen.has(item.id));
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  items: [],
  nextCursor: null,

  setUnreadCount(unreadCount) {
    set({ unreadCount });
  },

  replacePage(items, nextCursor) {
    set({ items, nextCursor });
  },

  appendPage(items, nextCursor) {
    set((state) => ({
      items: [...state.items, ...withoutDupes(state.items, items)],
      nextCursor,
    }));
  },

  prepend(items) {
    set((state) => ({
      items: [...withoutDupes(state.items, items), ...state.items],
    }));
  },

  markReadLocal(id) {
    set((state) => {
      const current = state.items.find((item) => item.id === id);
      const unread = Boolean(current && !current.readAt);
      return {
        items: state.items.map((item) =>
          item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
        ),
        unreadCount: unread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
  },

  markAllReadLocal() {
    set((state) => ({
      items: state.items.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
  },
}));

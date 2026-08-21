import { create } from 'zustand';

export type ToastKind = 'error' | 'ok' | 'info';

export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  removing: boolean;
}

interface ToastState {
  items: Toast[];
  nextId: number;
  add: (text: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
  remove: (id: number) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  nextId: 1,

  add(text, kind = 'error') {
    const id = get().nextId;
    set((s) => ({ items: [...s.items, { id, text, kind, removing: false }], nextId: id + 1 }));
    setTimeout(() => {
      const state = get();
      const item = state.items.find((t) => t.id === id);
      if (item && !item.removing) {
        state.dismiss(id);
      }
    }, 10_000);
  },

  dismiss(id) {
    set((s) => ({
      items: s.items.map((t) => (t.id === id ? { ...t, removing: true } : t)),
    }));
    setTimeout(() => get().remove(id), 350);
  },

  remove(id) {
    set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  },
}));

export function toast(text: string, kind?: ToastKind): void {
  useToastStore.getState().add(text, kind);
}

import { create } from 'zustand';

export type ToastKind = 'error' | 'ok' | 'info';

export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  removing: boolean;
  frozen: boolean;
}

interface ToastState {
  items: Toast[];
  nextId: number;
  add: (text: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
  remove: (id: number) => void;
  freeze: (id: number) => void;
  unfreeze: (id: number) => void;
}

const FADE_DELAY = 2000;
const DISMISS_DELAY = 10000;
const REMOVE_DELAY = 350;

function scheduleFade(id: number) {
  setTimeout(() => {
    const state = useToastStore.getState();
    const item = state.items.find((t) => t.id === id);
    if (item && !item.frozen && !item.removing) {
      state.dismiss(id);
    }
  }, FADE_DELAY);
}

function scheduleRemove(id: number) {
  setTimeout(() => {
    useToastStore.getState().remove(id);
  }, REMOVE_DELAY);
}

function scheduleAutoDismiss(id: number) {
  setTimeout(() => {
    const state = useToastStore.getState();
    const item = state.items.find((t) => t.id === id);
    if (item && !item.frozen && !item.removing) {
      state.dismiss(id);
      scheduleRemove(id);
    }
  }, DISMISS_DELAY);
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  nextId: 1,

  add(text, kind = 'error') {
    const id = get().nextId;
    set((s) => ({ items: [...s.items, { id, text, kind, removing: false, frozen: false }], nextId: id + 1 }));
    scheduleFade(id);
    scheduleAutoDismiss(id);
  },

  dismiss(id) {
    set((s) => ({
      items: s.items.map((t) => (t.id === id ? { ...t, removing: true } : t)),
    }));
    scheduleRemove(id);
  },

  remove(id) {
    set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  },

  freeze(id) {
    set((s) => ({
      items: s.items.map((t) => (t.id === id ? { ...t, frozen: true } : t)),
    }));
  },

  unfreeze(id) {
    set((s) => ({
      items: s.items.map((t) => (t.id === id ? { ...t, frozen: false } : t)),
    }));
    scheduleFade(id);
    scheduleAutoDismiss(id);
  },
}));

export function toast(text: string, kind?: ToastKind): void {
  useToastStore.getState().add(text, kind);
}

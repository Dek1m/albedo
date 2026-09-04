import { create } from 'zustand';

export interface RegenRequest {
  assistantId: string;
  parentId: string;
}

interface ChatRunState {
  regen: RegenRequest | null;
  requestRegen: (next: RegenRequest) => void;
  clearRegen: () => void;
}

export const useChatRun = create<ChatRunState>((set) => ({
  regen: null,
  requestRegen: (next) => set({ regen: next }),
  clearRegen: () => set({ regen: null }),
}));

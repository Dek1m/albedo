import { create } from 'zustand';

interface ShareUiState {
  path: string | null;
  open: (path: string) => void;
  close: () => void;
}

export const useShareStore = create<ShareUiState>((set) => ({
  path: null,
  open(path) {
    set({ path });
  },
  close() {
    set({ path: null });
  },
}));

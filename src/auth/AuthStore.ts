import { create } from 'zustand';
import type { Profile } from '../domain/user';

interface AuthState {
  isAuthenticated: boolean;
  profile: Profile | null;
  settingsOpen: boolean;
  markAuthenticated: (profile: Profile) => void;
  setProfile: (profile: Profile) => void;
  setSettingsOpen: (open: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  profile: null,
  settingsOpen: false,
  markAuthenticated: (profile) => set({ isAuthenticated: true, profile }),
  setProfile: (profile) => set({ profile }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  clearSession: () => set({ isAuthenticated: false, profile: null, settingsOpen: false }),
}));

import { create } from 'zustand';
import type { SessionId, Workspace, WorkspaceId, WsSession } from '../domain/workspace';

interface WorkspaceState {
  catalog: Workspace[];
  active: Workspace | null;
  sessions: WsSession[];
  focusedSessionId: SessionId | null;
  sidebarWidth: number;
  foldersOpen: boolean;
  setCatalog: (items: Workspace[]) => void;
  openDashboard: (ws: Workspace, sessions: WsSession[]) => void;
  closeDashboard: () => void;
  setSessions: (items: WsSession[]) => void;
  setFocused: (id: SessionId | null) => void;
  setSidebarWidth: (width: number) => void;
  setFoldersOpen: (open: boolean) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  catalog: [],
  active: null,
  sessions: [],
  focusedSessionId: null,
  sidebarWidth: 240,
  foldersOpen: true,
  setCatalog: (catalog) => set({ catalog }),
  openDashboard: (active, sessions) =>
    set({
      active,
      sessions,
      focusedSessionId: sessions.find((s) => s.tabOpen)?.id ?? null,
    }),
  closeDashboard: () => set({ active: null, sessions: [], focusedSessionId: null }),
  setSessions: (sessions) => set({ sessions }),
  setFocused: (focusedSessionId) => set({ focusedSessionId }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setFoldersOpen: (foldersOpen) => set({ foldersOpen }),
  reset: () =>
    set({
      catalog: [],
      active: null,
      sessions: [],
      focusedSessionId: null,
      foldersOpen: true,
    }),
}));

export function activeWorkspaceId(): WorkspaceId | null {
  return useWorkspaceStore.getState().active?.id ?? null;
}

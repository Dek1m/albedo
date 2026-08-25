import { create } from 'zustand';
import type { SessionId, Workspace, WorkspaceId, WsSession } from '../domain/workspace';

function withAncestors(paths: string[]): string[] {
  const out = new Set<string>();
  for (const path of paths) {
    if (!path) {
      continue;
    }
    const parts = path.split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      out.add(acc);
    }
  }
  return [...out];
}

interface WorkspaceState {
  catalog: Workspace[];
  active: Workspace | null;
  sessions: WsSession[];
  focusedSessionId: SessionId | null;
  sidebarWidth: number;
  foldersOpen: boolean;
  expanded: string[];
  setCatalog: (items: Workspace[]) => void;
  openDashboard: (ws: Workspace, sessions: WsSession[]) => void;
  closeDashboard: () => void;
  setSessions: (items: WsSession[]) => void;
  setFocused: (id: SessionId | null) => void;
  setSidebarWidth: (width: number) => void;
  setFoldersOpen: (open: boolean) => void;
  setExpanded: (paths: string[]) => void;
  toggleExpanded: (path: string) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  catalog: [],
  active: null,
  sessions: [],
  focusedSessionId: null,
  sidebarWidth: 240,
  foldersOpen: true,
  expanded: [],
  setCatalog: (catalog) => set({ catalog }),
  openDashboard: (active, sessions) =>
    set({
      active,
      sessions,
      focusedSessionId: sessions.find((s) => s.tabOpen)?.id ?? null,
    }),
  closeDashboard: () => set({ active: null, sessions: [], focusedSessionId: null, expanded: [] }),
  setSessions: (sessions) => set({ sessions }),
  setFocused: (focusedSessionId) => set({ focusedSessionId }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setFoldersOpen: (foldersOpen) => set({ foldersOpen }),
  setExpanded: (expanded) => set({ expanded: withAncestors(expanded) }),
  toggleExpanded: (path) =>
    set((state) => {
      if (state.expanded.includes(path)) {
        return {
          expanded: state.expanded.filter(
            (item) => item !== path && !item.startsWith(`${path}/`),
          ),
        };
      }
      return { expanded: withAncestors([...state.expanded, path]) };
    }),
  reset: () =>
    set({
      catalog: [],
      active: null,
      sessions: [],
      focusedSessionId: null,
      foldersOpen: true,
      expanded: [],
    }),
}));

export function activeWorkspaceId(): WorkspaceId | null {
  return useWorkspaceStore.getState().active?.id ?? null;
}

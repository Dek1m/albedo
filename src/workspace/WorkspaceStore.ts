import { create } from 'zustand';
import type { SessionId, Workspace, WorkspaceId, WsSession } from '../domain/workspace';

export function mergeWorkspaceTabs(
  tabs: WsSession[],
  workspaceId: string,
  list: WsSession[],
): WsSession[] {
  const others = tabs.filter((item) => item.workspaceId !== workspaceId);
  return [...others, ...list.filter((item) => item.tabOpen)];
}

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
  tabs: WsSession[];
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
  tabs: [],
  focusedSessionId: null,
  sidebarWidth: 240,
  foldersOpen: true,
  expanded: [],
  setCatalog: (catalog) => set({ catalog }),
  openDashboard: (active, sessions) =>
    set((state) => {
      const tabs = mergeWorkspaceTabs(state.tabs, active.id, sessions);
      const focused =
        tabs.find((item) => item.id === state.focusedSessionId)?.id ??
        sessions.find((item) => item.tabOpen)?.id ??
        tabs[0]?.id ??
        null;
      return { active, sessions, tabs, focusedSessionId: focused };
    }),
  closeDashboard: () =>
    set({ active: null, sessions: [], tabs: [], focusedSessionId: null, expanded: [] }),
  setSessions: (sessions) =>
    set((state) => ({
      sessions,
      tabs: state.active ? mergeWorkspaceTabs(state.tabs, state.active.id, sessions) : state.tabs,
    })),
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
      tabs: [],
      focusedSessionId: null,
      foldersOpen: true,
      expanded: [],
    }),
}));

export function activeWorkspaceId(): WorkspaceId | null {
  return useWorkspaceStore.getState().active?.id ?? null;
}

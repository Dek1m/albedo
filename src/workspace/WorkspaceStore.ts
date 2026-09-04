import { create } from 'zustand';
import type { SessionId, Workspace, WorkspaceId, WsSession } from '../domain/workspace';

export function dockHeightMax(): number {
  const vh = typeof window === 'undefined' ? 480 : Math.round(window.innerHeight * 0.5);
  return Math.min(480, Math.max(120, vh || 480));
}

export function clampDockHeight(height: number): number {
  return Math.min(Math.max(height, 120), dockHeightMax());
}

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
  dockHeight: number;
  dockTab: 'message' | 'terminal';
  chatRev: number;
  composerDraft: string | null;
  composerParentId: string | null;
  threadTailId: string | null;
  branchPick: Record<string, string>;
  foldersOpen: boolean;
  expanded: string[];
  setCatalog: (items: Workspace[]) => void;
  openDashboard: (ws: Workspace, sessions: WsSession[]) => void;
  closeDashboard: () => void;
  setSessions: (items: WsSession[]) => void;
  setFocused: (id: SessionId | null) => void;
  setSidebarWidth: (width: number) => void;
  setDockHeight: (height: number) => void;
  setDockTab: (tab: 'message' | 'terminal') => void;
  bumpChatRev: () => void;
  setComposerDraft: (draft: string | null) => void;
  setComposerParentId: (parentId: string | null) => void;
  setThreadTailId: (id: string | null) => void;
  setBranchPick: (parentId: string, childId: string) => void;
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
  dockHeight: 200,
  dockTab: 'message',
  chatRev: 0,
  composerDraft: null,
  composerParentId: null,
  threadTailId: null,
  branchPick: {},
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
    set({
      active: null,
      sessions: [],
      tabs: [],
      focusedSessionId: null,
      expanded: [],
      branchPick: {},
      composerParentId: null,
    }),
  setSessions: (sessions) =>
    set((state) => ({
      sessions,
      tabs: state.active ? mergeWorkspaceTabs(state.tabs, state.active.id, sessions) : state.tabs,
    })),
  setFocused: (focusedSessionId) => set({ focusedSessionId }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setDockHeight: (height) => set({ dockHeight: clampDockHeight(height) }),
  setDockTab: (dockTab) => set({ dockTab }),
  bumpChatRev: () => set((state) => ({ chatRev: state.chatRev + 1 })),
  setComposerDraft: (composerDraft) => set({ composerDraft }),
  setComposerParentId: (composerParentId) => set({ composerParentId }),
  setThreadTailId: (threadTailId) => set({ threadTailId }),
  setBranchPick: (parentId, childId) =>
    set((state) => ({ branchPick: { ...state.branchPick, [parentId]: childId } })),
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
      composerDraft: null,
      composerParentId: null,
      branchPick: {},
      expanded: [],
    }),
}));

export function activeWorkspaceId(): WorkspaceId | null {
  return useWorkspaceStore.getState().active?.id ?? null;
}

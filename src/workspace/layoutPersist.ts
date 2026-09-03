import { useAuthStore } from '../auth/AuthStore';
import { useWorkspaceStore } from './WorkspaceStore';

let persistEnabled = false;

export function enableLayoutPersist(): void {
  persistEnabled = true;
}

export interface ShellLayout {
  workspaceId: string | null;
  focusedSessionId: string | null;
  openSessionIds: string[];
  foldersOpen: boolean;
  sidebarWidth: number;
  dockHeight: number;
  expandedByWs: Record<string, string[]>;
}

function key(userId: string): string {
  return `albedo.layout.${userId}`;
}

export function readLayout(userId: string): ShellLayout | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ShellLayout;
    return {
      workspaceId: parsed.workspaceId ?? null,
      focusedSessionId: parsed.focusedSessionId ?? null,
      openSessionIds: parsed.openSessionIds ?? [],
      foldersOpen: parsed.foldersOpen !== false,
      sidebarWidth: typeof parsed.sidebarWidth === 'number' ? parsed.sidebarWidth : 240,
      dockHeight: typeof parsed.dockHeight === 'number' ? parsed.dockHeight : 200,
      expandedByWs: parsed.expandedByWs ?? {},
    };
  } catch {
    return null;
  }
}

export function writeLayout(userId: string, layout: ShellLayout): void {
  localStorage.setItem(key(userId), JSON.stringify(layout));
}

export function applySavedWorkspaceChrome(workspaceId: string, sessions: { id: string; tabOpen: boolean }[]): void {
  const userId = useAuthStore.getState().profile?.id;
  if (!userId) {
    return;
  }
  const layout = readLayout(userId);
  const store = useWorkspaceStore.getState();
  store.setExpanded(layout?.expandedByWs[workspaceId] ?? []);
  const focus = sessions.find((item) => item.id === layout?.focusedSessionId && item.tabOpen);
  if (focus) {
    store.setFocused(focus.id as typeof store.focusedSessionId);
  }
}

export function persistCurrentLayout(): void {
  if (!persistEnabled) {
    return;
  }
  const userId = useAuthStore.getState().profile?.id;
  if (!userId) {
    return;
  }
  const state = useWorkspaceStore.getState();
  const prev = readLayout(userId);
  const expandedByWs = { ...(prev?.expandedByWs ?? {}) };
  if (state.active) {
    expandedByWs[state.active.id] = state.expanded;
  }
  writeLayout(userId, {
    workspaceId: state.active?.id ?? null,
    focusedSessionId: state.focusedSessionId,
    openSessionIds: state.tabs.filter((item) => item.tabOpen).map((item) => item.id),
    foldersOpen: state.foldersOpen,
    sidebarWidth: state.sidebarWidth,
    dockHeight: state.dockHeight,
    expandedByWs,
  });
}

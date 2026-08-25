import { useAuthStore } from '../auth/AuthStore';
import { useWorkspaceStore } from './WorkspaceStore';

export interface ShellLayout {
  workspaceId: string | null;
  focusedSessionId: string | null;
  foldersOpen: boolean;
  sidebarWidth: number;
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
      foldersOpen: parsed.foldersOpen !== false,
      sidebarWidth: typeof parsed.sidebarWidth === 'number' ? parsed.sidebarWidth : 240,
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
    foldersOpen: state.foldersOpen,
    sidebarWidth: state.sidebarWidth,
    expandedByWs,
  });
}

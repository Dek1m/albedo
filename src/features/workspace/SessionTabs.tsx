import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import { asSessionId, workspaceHue } from '../../domain/workspace';
import { BusyDots } from '../../shared/ui/BusyDots';
import { toast } from '../../shared/toast/toastStore';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';

export function SessionTabs(): ReactElement | null {
  const active = useWorkspaceStore((s) => s.active);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const focused = useWorkspaceStore((s) => s.focusedSessionId);
  const setFocused = useWorkspaceStore((s) => s.setFocused);
  const setSessions = useWorkspaceStore((s) => s.setSessions);
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);
  const catalog = useWorkspaceStore((s) => s.catalog);
  const open = tabs.filter((s) => s.tabOpen);

  if (open.length === 0) {
    return null;
  }

  const refreshWs = async (workspaceId: string): Promise<void> => {
    const list = await workspaceApi.listSessions(workspaceId);
    if (useWorkspaceStore.getState().active?.id === workspaceId) {
      setSessions(list);
    } else {
      useWorkspaceStore.setState((state) => ({
        tabs: state.tabs
          .filter((item) => item.workspaceId !== workspaceId)
          .concat(list.filter((item) => item.tabOpen)),
      }));
    }
  };

  const focusTab = async (workspaceId: string, sessionId: string): Promise<void> => {
    setFocused(asSessionId(sessionId));
    if (active?.id === workspaceId) {
      return;
    }
    try {
      const ws = catalog.find((item) => item.id === workspaceId) ?? (await workspaceApi.get(workspaceId));
      const list = await workspaceApi.listSessions(workspaceId);
      openDashboard(ws, list);
      setFocused(asSessionId(sessionId));
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const closeOne = async (workspaceId: string, sessionId: string): Promise<void> => {
    try {
      await workspaceApi.closeSession(workspaceId, sessionId);
      await refreshWs(workspaceId);
      if (focused === sessionId) {
        const rest = useWorkspaceStore.getState().tabs.filter((s) => s.tabOpen && s.id !== sessionId);
        setFocused(rest[0]?.id ?? null);
      }
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const closeAll = async (): Promise<void> => {
    try {
      const ids = [...new Set(open.map((item) => item.workspaceId))];
      for (const workspaceId of ids) {
        await workspaceApi.closeAllTabs(workspaceId);
        await refreshWs(workspaceId);
      }
      setFocused(null);
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <div className="albedo-tabs">
      {open.map((session) => (
        <button
          key={session.id}
          type="button"
          className={`albedo-tab${focused === session.id ? ' is-focused' : ''}`}
          onClick={() => void focusTab(session.workspaceId, session.id)}
        >
          <span className="albedo-tab-mark">
            {session.agentBusy ? (
              <BusyDots />
            ) : (
              <span className="albedo-session-ball" style={{ background: workspaceHue(session.workspaceId) }}>
                {session.title.slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
          <span className="albedo-tab-title">{session.title}</span>
          <span
            className="albedo-tab-x"
            role="button"
            onClick={(event) => {
              event.stopPropagation();
              void closeOne(session.workspaceId, session.id);
            }}
          >
            ×
          </span>
        </button>
      ))}
      <button type="button" className="albedo-tab-close-all" title="Close all" onClick={() => void closeAll()}>
        ×
      </button>
    </div>
  );
}

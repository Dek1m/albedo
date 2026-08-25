import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import { sessionHue } from '../../domain/workspace';
import { BusyDots } from '../../shared/ui/BusyDots';
import { toast } from '../../shared/toast/toastStore';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';

export function SessionTabs(): ReactElement | null {
  const active = useWorkspaceStore((s) => s.active);
  const sessions = useWorkspaceStore((s) => s.sessions);
  const focused = useWorkspaceStore((s) => s.focusedSessionId);
  const setFocused = useWorkspaceStore((s) => s.setFocused);
  const setSessions = useWorkspaceStore((s) => s.setSessions);
  const open = sessions.filter((s) => s.tabOpen);

  if (!active || open.length === 0) {
    return null;
  }

  const refresh = async (): Promise<void> => {
    setSessions(await workspaceApi.listSessions(active.id));
  };

  const closeOne = async (sessionId: string): Promise<void> => {
    try {
      await workspaceApi.closeSession(active.id, sessionId);
      await refresh();
      if (focused === sessionId) {
        const rest = useWorkspaceStore.getState().sessions.filter((s) => s.tabOpen && s.id !== sessionId);
        setFocused(rest[0]?.id ?? null);
      }
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const closeAll = async (): Promise<void> => {
    try {
      await workspaceApi.closeAllTabs(active.id);
      await refresh();
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
          onClick={() => setFocused(session.id)}
        >
          <span className="albedo-tab-mark">
            {session.agentBusy ? (
              <BusyDots />
            ) : (
              <span className="albedo-session-ball" style={{ background: sessionHue(session.title) }}>
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
              void closeOne(session.id);
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

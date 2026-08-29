import { useState } from 'react';
import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Window } from '../../shared/ui/Window';
import { BusyDots } from '../../shared/ui/BusyDots';
import { workspaceHue } from '../../domain/workspace';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { HomeTree, folderOverlap } from './HomeTree';
import { applySavedWorkspaceChrome } from '../../workspace/layoutPersist';
import { loadCatalog } from './WorkspaceMenu';

interface Props {
  listOpen: boolean;
  createOpen: boolean;
  sessionsOpen: boolean;
  onCloseList: () => void;
  onCloseCreate: () => void;
  onCloseSessions: () => void;
  onAskCreate: () => void;
}

export function WorkspaceModals({
  listOpen,
  createOpen,
  sessionsOpen,
  onCloseList,
  onCloseCreate,
  onCloseSessions,
  onAskCreate,
}: Props): ReactElement {
  const catalog = useWorkspaceStore((s) => s.catalog);
  const active = useWorkspaceStore((s) => s.active);
  const sessions = useWorkspaceStore((s) => s.sessions);
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);
  const setSessions = useWorkspaceStore((s) => s.setSessions);
  const setFocused = useWorkspaceStore((s) => s.setFocused);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [sessionTitle, setSessionTitle] = useState('');

  const openWs = async (id: string): Promise<void> => {
    try {
      const ws = await workspaceApi.get(id);
      const list = await workspaceApi.listSessions(id);
      openDashboard(ws, list);
      applySavedWorkspaceChrome(ws.id, list);
      onCloseList();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const createWs = async (): Promise<void> => {
    if (!name.trim()) {
      toast('Name is required');
      return;
    }
    try {
      const ws = await workspaceApi.create(name.trim(), [...picked]);
      await loadCatalog();
      const list = await workspaceApi.listSessions(ws.id);
      openDashboard(ws, list);
      applySavedWorkspaceChrome(ws.id, list);
      setName('');
      setPicked(new Set());
      onCloseCreate();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const removeWs = async (id: string): Promise<void> => {
    try {
      await workspaceApi.remove(id);
      if (active?.id === id) {
        useWorkspaceStore.getState().closeDashboard();
      }
      await loadCatalog();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const refreshSessions = async (): Promise<void> => {
    if (!active) {
      return;
    }
    setSessions(await workspaceApi.listSessions(active.id));
  };

  const createSession = async (): Promise<void> => {
    if (!active || !sessionTitle.trim()) {
      return;
    }
    try {
      await workspaceApi.createSession(active.id, sessionTitle.trim());
      setSessionTitle('');
      await refreshSessions();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const openSession = async (sessionId: string): Promise<void> => {
    if (!active) {
      return;
    }
    try {
      const opened = await workspaceApi.openSession(active.id, sessionId);
      await refreshSessions();
      setFocused(opened.id);
      onCloseSessions();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    if (!active) {
      return;
    }
    try {
      await workspaceApi.deleteSession(active.id, sessionId);
      await refreshSessions();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <>
      <Window className="albedo-workspaces" windowId="albedo-workspaces" open={listOpen} title="Workspaces" onClose={onCloseList}>
        <ul className="list-group albedo-ws-list">
          {catalog.map((ws) => (
            <li key={ws.id} className={`list-group-item${active?.id === ws.id ? ' active' : ''}`}>
              <button type="button" className="albedo-ws-list-name" onClick={() => void openWs(ws.id)}>
                {ws.name}
              </button>
              <button type="button" className="btn btn-sm albedo-danger-btn" onClick={() => void removeWs(ws.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-sm btn-albedo-primary mt-2" onClick={onAskCreate}>
          New workspace
        </button>
      </Window>

      <Window className="albedo-workspace-create" windowId="albedo-workspace-create" open={createOpen} title="New workspace" onClose={onCloseCreate}>
        <label className="form-label" htmlFor="ws-name">
          Name
        </label>
        <input id="ws-name" className="form-control form-control-sm" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="form-label mt-2">Folders from ~/</label>
        {createOpen ? (
          <HomeTree
            selected={picked}
            onToggle={(rel) => {
              setPicked((prev) => {
                const next = new Set(prev);
                if (next.has(rel)) {
                  next.delete(rel);
                  return next;
                }
                const overlap = folderOverlap(rel, next);
                if (overlap === 'nested') {
                  toast('This folder is already inside one added to the project');
                  return prev;
                }
                if (overlap === 'contains') {
                  toast('The project already has a nested folder — remove it first');
                  return prev;
                }
                next.add(rel);
                return next;
              });
            }}
          />
        ) : null}
        <button type="button" className="btn btn-sm btn-albedo-primary mt-3" onClick={() => void createWs()}>
          Create
        </button>
      </Window>

      <Window className="albedo-sessions" windowId="albedo-sessions" open={sessionsOpen} title="Sessions" onClose={onCloseSessions}>
        <ul className="list-group albedo-ws-list">
          {sessions.map((session) => (
            <li
              key={session.id}
              className={`list-group-item albedo-session-row${session.tabOpen ? ' albedo-session-row--open' : ''}${session.agentBusy ? ' albedo-session-row--busy' : ''}`}
            >
              <span className="albedo-session-mark">
                {session.agentBusy ? <BusyDots /> : <span className="albedo-session-ball" style={{ background: active ? workspaceHue(active.id) : '#888' }} />}
              </span>
              <button type="button" className="albedo-ws-list-name" onClick={() => void openSession(session.id)}>
                {session.title}
              </button>
              <button type="button" className="btn btn-sm albedo-danger-btn" onClick={() => void deleteSession(session.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div className="albedo-session-create">
          <input
            className="form-control form-control-sm"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="New session"
          />
          <button type="button" className="btn btn-sm btn-albedo-primary" onClick={() => void createSession()}>
            Add
          </button>
        </div>
      </Window>
    </>
  );
}

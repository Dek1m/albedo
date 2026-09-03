import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Window } from '../../shared/ui/Window';
import { BusyDots } from '../../shared/ui/BusyDots';
import { workspaceHue } from '../../domain/workspace';
import type { WsSession } from '../../domain/workspace';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { HomeTree, folderOverlap } from './HomeTree';
import { applySavedWorkspaceChrome } from '../../workspace/layoutPersist';
import { loadCatalog } from './WorkspaceMenu';
import { MarkdownPrompt } from '../ai/MarkdownPrompt';

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
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);
  const setSessions = useWorkspaceStore((s) => s.setSessions);
  const setFocused = useWorkspaceStore((s) => s.setFocused);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionWsId, setSessionWsId] = useState<string>('');
  const [modalSessions, setModalSessions] = useState<WsSession[]>([]);

  useEffect(() => {
    if (!sessionsOpen) {
      return;
    }
    const next = sessionWsId || active?.id || catalog[0]?.id || '';
    if (next && next !== sessionWsId) {
      setSessionWsId(next);
      return;
    }
    if (!next) {
      setModalSessions([]);
      return;
    }
    let cancelled = false;
    void workspaceApi
      .listSessions(next)
      .then((items) => {
        if (!cancelled) {
          setModalSessions(items);
        }
      })
      .catch((err: unknown) => toast(humanMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [sessionsOpen, sessionWsId, active?.id, catalog]);

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
      const ws = await workspaceApi.create(name.trim(), [...picked], description);
      await loadCatalog();
      const list = await workspaceApi.listSessions(ws.id);
      openDashboard(ws, list);
      applySavedWorkspaceChrome(ws.id, list);
      setName('');
      setDescription('');
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

  const createSession = async (): Promise<void> => {
    if (!sessionWsId || !sessionTitle.trim()) {
      return;
    }
    try {
      await workspaceApi.createSession(sessionWsId, sessionTitle.trim(), sessionDescription);
      setSessionTitle('');
      setSessionDescription('');
      const list = await workspaceApi.listSessions(sessionWsId);
      setModalSessions(list);
      if (active?.id === sessionWsId) {
        setSessions(list);
      }
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const openSession = async (sessionId: string): Promise<void> => {
    if (!sessionWsId) {
      return;
    }
    try {
      const opened = await workspaceApi.openSession(sessionWsId, sessionId);
      const list = await workspaceApi.listSessions(sessionWsId);
      setModalSessions(list);
      if (active?.id === sessionWsId) {
        setSessions(list);
        setFocused(opened.id);
      } else {
        const ws = catalog.find((item) => item.id === sessionWsId) ?? (await workspaceApi.get(sessionWsId));
        openDashboard(ws, list);
        setFocused(opened.id);
      }
      onCloseSessions();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    if (!sessionWsId) {
      return;
    }
    try {
      await workspaceApi.deleteSession(sessionWsId, sessionId);
      const list = await workspaceApi.listSessions(sessionWsId);
      setModalSessions(list);
      if (active?.id === sessionWsId) {
        setSessions(list);
      }
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
        <div className="albedo-list-create">
          <button type="button" className="btn btn-sm btn-albedo-primary" onClick={onAskCreate}>
            New workspace
          </button>
        </div>
      </Window>

      <Window className="albedo-workspace-create" windowId="albedo-workspace-create" parentId="albedo-workspaces" open={createOpen} title="New workspace" onClose={onCloseCreate}>
        <label className="form-label" htmlFor="ws-name">
          Name
        </label>
        <input id="ws-name" className="form-control form-control-sm" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="form-label mt-2">Description</label>
        <MarkdownPrompt value={description} onChange={setDescription} />
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
        <div className="albedo-list-create">
          <button type="button" className="btn btn-sm btn-albedo-primary" onClick={() => void createWs()}>
            Create
          </button>
        </div>
      </Window>

      <Window className="albedo-sessions" windowId="albedo-sessions" open={sessionsOpen} title="Sessions" onClose={onCloseSessions}>
        <label className="form-label" htmlFor="session-ws">
          Workspace
        </label>
        <select
          id="session-ws"
          className="form-select form-select-sm"
          value={sessionWsId}
          onChange={(event) => setSessionWsId(event.target.value)}
        >
          {catalog.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
        <ul className="list-group albedo-ws-list mt-2">
          {modalSessions.map((session) => (
            <li
              key={session.id}
              className={`list-group-item albedo-session-row${session.tabOpen ? ' albedo-session-row--open' : ''}${session.agentBusy ? ' albedo-session-row--busy' : ''}`}
            >
              <span className="albedo-session-mark">
                {session.agentBusy ? (
                  <BusyDots />
                ) : (
                  <span className="albedo-session-ball" style={{ background: workspaceHue(session.workspaceId) }} />
                )}
              </span>
              <button type="button" className="albedo-ws-list-name" onClick={() => void openSession(session.id)}>
                {session.title}
                {session.description ? <span className="albedo-ai-muted d-block">{session.description}</span> : null}
              </button>
              <button type="button" className="btn btn-sm albedo-danger-btn" onClick={() => void deleteSession(session.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        {!modalSessions.length ? <p className="albedo-ai-muted">No sessions</p> : null}
        <label className="form-label mt-2" htmlFor="session-title">
          Title
        </label>
        <input
          id="session-title"
          className="form-control form-control-sm"
          value={sessionTitle}
          onChange={(e) => setSessionTitle(e.target.value)}
          placeholder="New session"
        />
        <label className="form-label mt-2">Description</label>
        <MarkdownPrompt value={sessionDescription} onChange={setSessionDescription} />
        <div className="albedo-list-create">
          <button type="button" className="btn btn-sm btn-albedo-primary" disabled={!sessionWsId || !sessionTitle.trim()} onClick={() => void createSession()}>
            Add
          </button>
        </div>
      </Window>
    </>
  );
}

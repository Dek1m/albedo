import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ReactElement } from 'react';
import { logoutSession } from '../../application/session/logoutSession';
import { ToastView } from '../../shared/toast/ToastView';
import { UserSettingsModal } from '../settings/UserSettingsModal';
import { ChatPane } from '../workspace/ChatPane';
import { SessionTabs } from '../workspace/SessionTabs';
import { workspaceApi } from '../../api/workspaceApi';
import { AiMenu } from '../ai/AiMenu';
import type { AiPane } from '../ai/AiMenu';
import { AiWindows } from '../ai/AiWindows';
import { WorkspaceMenu, loadCatalog } from '../workspace/WorkspaceMenu';
import { WorkspaceModals } from '../workspace/WorkspaceModals';
import { WorkspaceSidebar } from '../workspace/WorkspaceSidebar';
import { useAuthStore } from '../../auth/AuthStore';
import {
  applySavedWorkspaceChrome,
  enableLayoutPersist,
  persistCurrentLayout,
  readLayout,
} from '../../workspace/layoutPersist';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { UserChip } from './UserChip';

export function AppShell(): ReactElement {
  const navigate = useNavigate();
  const active = useWorkspaceStore((s) => s.active);
  const [listOpen, setListOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [aiPane, setAiPane] = useState<AiPane | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await workspaceApi.ensureHome().catch(() => undefined);
      await loadCatalog();
      const userId = useAuthStore.getState().profile?.id;
      if (!userId || cancelled) {
        return;
      }
      const layout = readLayout(userId);
      if (layout?.workspaceId) {
        try {
          const ws = await workspaceApi.get(layout.workspaceId);
          for (const sessionId of layout.openSessionIds) {
            try {
              await workspaceApi.openSession(ws.id, sessionId);
            } catch {
              /* сессия могла исчезнуть */
            }
          }
          const sessions = await workspaceApi.listSessions(ws.id);
          if (!cancelled) {
            const store = useWorkspaceStore.getState();
            store.openDashboard(ws, sessions);
            store.setFoldersOpen(layout.foldersOpen);
            store.setSidebarWidth(layout.sidebarWidth);
            applySavedWorkspaceChrome(ws.id, sessions);
          }
        } catch {
          /* workspace мог быть удалён */
        }
      }
      if (!cancelled) {
        enableLayoutPersist();
        persistCurrentLayout();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return useWorkspaceStore.subscribe(() => persistCurrentLayout());
  }, []);

  const onLogout = async (): Promise<void> => {
    await logoutSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="albedo-shell">
      <header className="albedo-header">
        <div className="albedo-header-left">
          <span className="albedo-brand">albedo</span>
          <WorkspaceMenu
            onOpenList={() => {
              void loadCatalog();
              setListOpen(true);
            }}
            onOpenSessions={() => setSessionsOpen(true)}
          />
          <AiMenu onOpen={setAiPane} />
        </div>
        <div className="albedo-header-actions">
          <UserChip />
          <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={() => void onLogout()}>
            Sign out
          </button>
        </div>
      </header>
      {active ? <SessionTabs /> : null}
      <div className="albedo-body">
        {active ? <WorkspaceSidebar onOpenSessions={() => setSessionsOpen(true)} /> : null}
        <main className="albedo-workspace">
          {active ? <ChatPane /> : <p className="albedo-workspace-ready">ready</p>}
        </main>
      </div>
      <AiWindows pane={aiPane} onClose={() => setAiPane(null)} />
      <WorkspaceModals
        listOpen={listOpen}
        createOpen={createOpen}
        sessionsOpen={sessionsOpen}
        onCloseList={() => setListOpen(false)}
        onCloseCreate={() => setCreateOpen(false)}
        onCloseSessions={() => setSessionsOpen(false)}
        onAskCreate={() => {
          setListOpen(false);
          setCreateOpen(true);
        }}
      />
      <ToastView />
      <UserSettingsModal />
    </div>
  );
}

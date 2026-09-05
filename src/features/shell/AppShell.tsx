import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ReactElement } from 'react';
import { logoutSession } from '../../application/session/logoutSession';
import { ToastView } from '../../shared/toast/ToastView';
import { loadWindowLayouts } from '../../shared/ui/windowLayout';
import { UserSettingsModal } from '../settings/UserSettingsModal';
import { ChatPane } from '../workspace/ChatPane';
import { SessionTabs } from '../workspace/SessionTabs';
import { workspaceApi } from '../../api/workspaceApi';
import { syncLlmCatalogOnAuth } from '../../application/llm/syncCatalog';
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
import { NotificationBell } from '../notifications/NotificationBell';
import { ShareDialog } from '../share/ShareDialog';
import { SystemMenu } from '../system/SystemMenu';
import type { SystemPane } from '../system/SystemMenu';
import { SystemWindows } from '../system/SystemWindows';
import { Dock } from '../dock/Dock';
import { BrandMark } from './BrandMark';
import { UserChip } from './UserChip';

export function AppShell(): ReactElement {
  const navigate = useNavigate();
  const active = useWorkspaceStore((s) => s.active);
  const [listOpen, setListOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [aiPane, setAiPane] = useState<AiPane | null>(null);
  const [systemPane, setSystemPane] = useState<SystemPane | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await workspaceApi.ensureHome().catch(() => undefined);
      await syncLlmCatalogOnAuth();
      await loadWindowLayouts();
      await loadCatalog();
      const userId = useAuthStore.getState().profile?.id;
      if (!userId || cancelled) {
        return;
      }
      const layout = readLayout(userId);
      if (layout) {
        const store = useWorkspaceStore.getState();
        store.setSidebarWidth(layout.sidebarWidth);
        store.setDockHeight(layout.dockHeight);
      }
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
    // Drag сайдбара/дока даёт шквал событий стора — в localStorage пишем один раз за паузу.
    let timer = 0;
    const unsubscribe = useWorkspaceStore.subscribe(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(persistCurrentLayout, 300);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const onLogout = async (): Promise<void> => {
    await logoutSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="albedo-shell">
      <header className="albedo-header">
        <div className="albedo-header-row">
          <div className="albedo-header-left">
            <BrandMark />
            <WorkspaceMenu
              onOpenList={() => {
                void loadCatalog();
                setListOpen(true);
              }}
              onOpenSessions={() => setSessionsOpen(true)}
            />
            <AiMenu onOpen={setAiPane} />
            <SystemMenu onOpen={setSystemPane} />
          </div>
          <div className="albedo-header-actions">
            <UserChip />
            <NotificationBell />
            <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={() => void onLogout()}>
              Sign out
            </button>
          </div>
        </div>
        {active ? <SessionTabs /> : null}
      </header>
      <div className="albedo-body">
        {active ? <WorkspaceSidebar /> : null}
        <div className="albedo-main">
          <main className="albedo-workspace">
            {active ? <ChatPane /> : <p className="albedo-workspace-ready">ready</p>}
          </main>
          <Dock />
        </div>
      </div>
      <AiWindows pane={aiPane} onClose={() => setAiPane(null)} />
      <SystemWindows pane={systemPane} onClose={() => setSystemPane(null)} />
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
      <ShareDialog />
      <ToastView />
      <UserSettingsModal />
    </div>
  );
}

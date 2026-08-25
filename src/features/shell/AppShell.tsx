import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ReactElement } from 'react';
import { logoutSession } from '../../application/session/logoutSession';
import { ToastView } from '../../shared/toast/ToastView';
import { UserSettingsModal } from '../settings/UserSettingsModal';
import { ChatPane } from '../workspace/ChatPane';
import { SessionTabs } from '../workspace/SessionTabs';
import { workspaceApi } from '../../api/workspaceApi';
import { WorkspaceMenu, loadCatalog } from '../workspace/WorkspaceMenu';
import { WorkspaceModals } from '../workspace/WorkspaceModals';
import { WorkspaceSidebar } from '../workspace/WorkspaceSidebar';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { UserChip } from './UserChip';

export function AppShell(): ReactElement {
  const navigate = useNavigate();
  const active = useWorkspaceStore((s) => s.active);
  const [listOpen, setListOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  useEffect(() => {
    void workspaceApi.ensureHome().catch(() => undefined);
    void loadCatalog();
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

import { useNavigate } from 'react-router';
import type { ReactElement } from 'react';
import { logoutSession } from '../../application/session/logoutSession';
import { UserSettingsModal } from '../settings/UserSettingsModal';
import { UserChip } from './UserChip';

export function AppShell(): ReactElement {
  const navigate = useNavigate();

  const onLogout = async (): Promise<void> => {
    await logoutSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="albedo-shell">
      <header className="albedo-header">
        <span className="albedo-brand">albedo</span>
        <div className="albedo-header-actions">
          <UserChip />
          <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={() => void onLogout()}>
            Выйти
          </button>
        </div>
      </header>
      <main className="albedo-workspace" />
      <UserSettingsModal />
    </div>
  );
}

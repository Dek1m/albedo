import { useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { logoutSession } from '../../application/session/logoutSession';
import { useAuthStore } from '../../auth/AuthStore';
import { Window } from '../../shared/ui/Window';
import { GeneralTab } from './GeneralTab';
import { MemberOfTab } from './MemberOfTab';

type SettingsTab = 'general' | 'memberOf';

export function UserSettingsModal(): ReactElement | null {
  const open = useAuthStore((state) => state.settingsOpen);
  const setSettingsOpen = useAuthStore((state) => state.setSettingsOpen);
  const [tab, setTab] = useState<SettingsTab>('general');
  const navigate = useNavigate();

  const onLogout = async (): Promise<void> => {
    setSettingsOpen(false);
    await logoutSession();
    navigate('/login', { replace: true });
  };

  return (
    <Window className="albedo-settings" windowId="albedo-settings" open={open} title="Settings" onClose={() => setSettingsOpen(false)}>
      <ul className="nav nav-tabs mb-2">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${tab === 'general' ? ' active' : ''}`}
            onClick={() => setTab('general')}
          >
            General
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${tab === 'memberOf' ? ' active' : ''}`}
            onClick={() => setTab('memberOf')}
          >
            Member Of
          </button>
        </li>
      </ul>
      {tab === 'general' ? <GeneralTab /> : <MemberOfTab />}
      <div className="albedo-settings-footer">
        <button type="button" className="btn btn-sm albedo-danger-btn" onClick={() => void onLogout()}>
          Sign out
        </button>
      </div>
    </Window>
  );
}

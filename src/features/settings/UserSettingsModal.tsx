import { useState } from 'react';
import type { ReactElement } from 'react';
import { useAuthStore } from '../../auth/AuthStore';
import { Modal } from '../../shared/ui/Modal';
import { GeneralTab } from './GeneralTab';
import { MemberOfTab } from './MemberOfTab';

type SettingsTab = 'general' | 'memberOf';

export function UserSettingsModal(): ReactElement | null {
  const open = useAuthStore((state) => state.settingsOpen);
  const setSettingsOpen = useAuthStore((state) => state.setSettingsOpen);
  const [tab, setTab] = useState<SettingsTab>('general');

  return (
    <Modal open={open} title="Настройки пользователя" onClose={() => setSettingsOpen(false)}>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${tab === 'general' ? ' active' : ''}`}
            onClick={() => setTab('general')}
          >
            Общая
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
    </Modal>
  );
}

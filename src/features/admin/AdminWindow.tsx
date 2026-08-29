import { useState } from 'react';
import type { ReactElement } from 'react';
import { Window } from '../../shared/ui/Window';
import { DomainTab } from './DomainTab';
import { RolesTab } from './RolesTab';

type AdminTab = 'domain' | 'roles';

interface AdminWindowProps {
  open: boolean;
  onClose: () => void;
}

export function AdminWindow({ open, onClose }: AdminWindowProps): ReactElement {
  const [tab, setTab] = useState<AdminTab>('domain');

  const close = (): void => {
    setTab('domain');
    onClose();
  };

  return (
    <Window className="albedo-admin" windowId="albedo-admin" open={open} title="Admin Panel" onClose={close}>
      <ul className="nav nav-tabs mb-2">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${tab === 'domain' ? ' active' : ''}`}
            onClick={() => setTab('domain')}
          >
            Domain
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${tab === 'roles' ? ' active' : ''}`}
            onClick={() => setTab('roles')}
          >
            Roles
          </button>
        </li>
      </ul>
      {tab === 'domain' ? <DomainTab visible={open} /> : <RolesTab visible={open} />}
    </Window>
  );
}

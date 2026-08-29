import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { AdminCaps } from '../../api/adminApi';
import { useAuthStore } from '../../auth/AuthStore';
import { Window } from '../../shared/ui/Window';
import { DomainTab } from './DomainTab';
import { RolesTab } from './RolesTab';
import { isGroupAdmin, isRoleAdmin, isUserAdmin } from './userAdmin';

type AdminTab = 'domain' | 'roles';

interface AdminWindowProps {
  open: boolean;
  onClose: () => void;
}

export function AdminWindow({ open, onClose }: AdminWindowProps): ReactElement {
  const [tab, setTab] = useState<AdminTab>('domain');
  const [caps, setCaps] = useState<AdminCaps | null>(null);
  const profile = useAuthStore((state) => state.profile);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    void adminApi
      .caps()
      .then((value) => {
        if (!cancelled) {
          setCaps(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
           setCaps({ usersUpdate: false, groupsCreate: false, groupsUpdate: false, rolesUpdate: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const close = (): void => {
    setTab('domain');
    onClose();
  };

  const userAdmin = isUserAdmin(caps, profile);
  const groupAdmin = isGroupAdmin(caps, profile);
  const roleAdmin = isRoleAdmin(caps, profile);

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
      {tab === 'domain' ? (
        <DomainTab visible={open} userAdmin={userAdmin} groupAdmin={groupAdmin} roleAdmin={roleAdmin} />
      ) : (
        <RolesTab visible={open} />
      )}
    </Window>
  );
}

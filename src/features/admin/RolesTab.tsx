import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { AdminRole } from '../../api/adminApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { RoleCreateDialog } from './RoleCreateDialog';

interface RolesTabProps {
  visible: boolean;
}

export function RolesTab({ visible }: RolesTabProps): ReactElement {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const applyRoles = (items: AdminRole[], current: string | null): void => {
    setRoles(items);
    setSelectedId(current && items.some((role) => role.id === current) ? current : (items[0]?.id ?? null));
  };

  const load = useCallback(async (current: string | null): Promise<void> => {
    try {
      applyRoles(await adminApi.listRoles(), current);
    } catch (err) {
      toast(humanMessage(err));
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void adminApi
      .listRoles()
      .then((items) => {
        if (!cancelled) {
          applyRoles(items, null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast(humanMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (loading && !roles.length) {
    return <SkeletonList rows={6} />;
  }

  return (
    <div className="albedo-admin-roles">
      <div className="albedo-admin-role-toolbar">
        <button type="button" className="btn btn-sm btn-albedo-primary" onClick={() => setCreateOpen(true)}>
          New role
        </button>
      </div>
      <ul className="list-group albedo-admin-role-list">
        {roles.map((role) => (
          <li
            key={role.id}
            className={`list-group-item${selectedId === role.id ? ' active' : ''}`}
            onClick={() => setSelectedId(role.id)}
          >
            <i className={`bi ${role.isBuiltin ? 'bi-shield-fill' : 'bi-shield'}`} />
            <span>{role.name}</span>
            {role.isBuiltin ? <span className="albedo-badge">builtin</span> : null}
          </li>
        ))}
      </ul>
      {!roles.length ? <p className="albedo-ai-muted">No roles</p> : null}
      <RoleCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(roleId) => void load(roleId || null)}
      />
    </div>
  );
}

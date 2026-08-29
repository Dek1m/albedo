import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { AdminRole } from '../../api/adminApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Window } from '../../shared/ui/Window';

interface RoleEditWindowProps {
  roleId: string | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (role: AdminRole) => void;
}

const GROUPS = [
  { label: 'Providers', shift: 0 },
  { label: 'Share', shift: 12 },
  { label: 'Users', shift: 4 },
  { label: 'Groups', shift: 8 },
] as const;

const CRUD = ['C', 'R', 'U', 'D'] as const;

function bitOn(mask: number, bit: number): boolean {
  return (mask & (1 << bit)) !== 0;
}

function toggleBit(mask: number, bit: number): number {
  return mask ^ (1 << bit);
}

export function RoleEditWindow({ roleId, canEdit, onClose, onSaved }: RoleEditWindowProps): ReactElement {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [mask, setMask] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRole(null);
    if (!roleId) {
      return;
    }
    let cancelled = false;
    void adminApi
      .listRoles()
      .then((roles) => {
        const found = roles.find((item) => item.id === roleId) ?? null;
        if (!cancelled) {
          setRole(found);
          setMask(found?.capabilityMask ?? 0);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast(humanMessage(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roleId]);

  const locked = !canEdit || role?.name === 'system_admin';

  const save = async (): Promise<void> => {
    if (!role || locked) {
      return;
    }
    setSaving(true);
    try {
      await adminApi.upsertRoleMask(role.id, mask);
      const next = { ...role, capabilityMask: mask };
      toast('Saved', 'ok');
      onSaved(next);
      onClose();
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Window
      className="albedo-settings"
      windowId="albedo-admin-role-edit"
      open={Boolean(roleId)}
      title={role ? `Role: ${role.name}` : 'Role'}
      onClose={onClose}
    >
      {role?.description ? <p className="albedo-ai-muted">{role.description}</p> : null}
      <div className="albedo-admin-caps">
        {GROUPS.map((group) => (
          <fieldset key={group.label} className="albedo-admin-cap-group" disabled={locked}>
            <legend>{group.label}</legend>
            {CRUD.map((label, index) => {
              const bit = group.shift + index;
              const id = `role-edit-${role?.id ?? 'x'}-${String(bit)}`;
              return (
                <label key={label} className="form-check albedo-settings-check" htmlFor={id}>
                  <input
                    id={id}
                    className="form-check-input"
                    type="checkbox"
                    checked={bitOn(mask, bit)}
                    disabled={locked}
                    onChange={() => setMask(toggleBit(mask, bit))}
                  />
                  <span className="form-check-label">{label}</span>
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>
      <div className="albedo-confirm-actions">
        <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-sm btn-albedo-primary"
          disabled={locked || saving}
          onClick={() => void save()}
        >
          Save
        </button>
      </div>
    </Window>
  );
}

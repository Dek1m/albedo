import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { systemApi } from '../../api/systemApi';
import type { AdminRole } from '../../api/systemApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Window } from '../../shared/ui/Window';
import { bitOn, CRUD, entitiesForModules, ROLE_MODULES, toggleBit } from './roleCaps';

interface RoleEditWindowProps {
  roleId: string | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (role: AdminRole) => void;
}

/** Все модули сразу: окно редактирования показывает полную матрицу маски. */
const ENTITIES = entitiesForModules(new Set(ROLE_MODULES.map((module) => module.id)));

export function RoleEditWindow({ roleId, canEdit, onClose, onSaved }: RoleEditWindowProps): ReactElement {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [mask, setMask] = useState(0);
  const [saving, setSaving] = useState(false);
  const [prevRoleId, setPrevRoleId] = useState(roleId);

  // Сброс при смене роли: чистим во время рендера, не в useEffect.
  if (prevRoleId !== roleId) {
    setPrevRoleId(roleId);
    setRole(null);
    setMask(0);
  }

  useEffect(() => {
    if (!roleId) {
      return;
    }
    let cancelled = false;
    void systemApi
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

  // upsert_role_mask бэка блокирует все is_builtin роли — зеркало на фронте.
  const locked = !canEdit || Boolean(role?.isBuiltin);

  const save = async (): Promise<void> => {
    if (!role || locked) {
      return;
    }
    setSaving(true);
    try {
      await systemApi.upsertRoleMask(role.id, mask);
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
      parentId="albedo-admin"
      open={Boolean(roleId)}
      title={role ? `Role: ${role.name}` : 'Role'}
      onClose={onClose}
    >
      {role?.description ? <p className="albedo-ai-muted">{role.description}</p> : null}
      <div className="albedo-admin-caps">
        {ENTITIES.map((entity) => (
          <fieldset key={entity.id} className="albedo-admin-cap-group" disabled={locked}>
            <legend>{entity.label}</legend>
            {CRUD.map((label, index) => {
              const bit = entity.shift + index;
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

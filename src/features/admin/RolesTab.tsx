import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { AdminRole } from '../../api/adminApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { SkeletonList } from '../../shared/ui/Skeleton';

interface RolesTabProps {
  visible: boolean;
}

const GROUPS = [
  { label: 'Providers', shift: 0 },
  { label: 'Users', shift: 4 },
  { label: 'Groups', shift: 8 },
] as const;

const CRUD = ['C', 'R', 'U', 'D'] as const;

function isSystemAdmin(role: AdminRole): boolean {
  return role.name === 'system_admin';
}

function bitOn(mask: number, bit: number): boolean {
  return (mask & (1 << bit)) !== 0;
}

function toggleBit(mask: number, bit: number): number {
  return mask ^ (1 << bit);
}

export function RolesTab({ visible }: RolesTabProps): ReactElement {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftMask, setDraftMask] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyRoles = (items: AdminRole[], current: string | null): void => {
    setRoles(items);
    setSelectedId(current && items.some((role) => role.id === current) ? current : (items[0]?.id ?? null));
    setDraftMask(null);
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

  const selected = roles.find((role) => role.id === selectedId) ?? null;
  const locked = selected ? isSystemAdmin(selected) : true;
  const mask = draftMask ?? selected?.capabilityMask ?? 0;

  const save = async (): Promise<void> => {
    if (!selected || locked) {
      return;
    }
    setSaving(true);
    try {
      await adminApi.upsertRoleMask(selected.id, mask);
      toast('Saved', 'ok');
      await load(selected.id);
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !roles.length) {
    return <SkeletonList rows={6} />;
  }

  return (
    <div className="albedo-admin-roles">
      <ul className="list-group albedo-admin-role-list">
        {roles.map((role) => (
          <li
            key={role.id}
            className={`list-group-item${selectedId === role.id ? ' active' : ''}`}
            onClick={() => {
              setSelectedId(role.id);
              setDraftMask(null);
            }}
          >
            <span>{role.name}</span>
            {role.isBuiltin ? <span className="albedo-badge">builtin</span> : null}
          </li>
        ))}
      </ul>
      {selected ? (
        <div className="albedo-admin-role-detail">
          {selected.description ? <p className="albedo-ai-muted">{selected.description}</p> : null}
          <div className="albedo-admin-caps">
            {GROUPS.map((group) => (
              <fieldset key={group.label} className="albedo-admin-cap-group" disabled={locked}>
                <legend>{group.label}</legend>
                {CRUD.map((label, index) => {
                  const bit = group.shift + index;
                  const id = `cap-${selected.id}-${String(bit)}`;
                  return (
                    <label key={label} className="form-check albedo-settings-check" htmlFor={id}>
                      <input
                        id={id}
                        className="form-check-input"
                        type="checkbox"
                        checked={bitOn(mask, bit)}
                        disabled={locked}
                        onChange={() => setDraftMask(toggleBit(mask, bit))}
                      />
                      <span className="form-check-label">{label}</span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
          {selected.permissions.length ? (
            <p className="albedo-ai-muted">{selected.permissions.join(', ')}</p>
          ) : null}
          <div className="albedo-confirm-actions">
            <button
              type="button"
              className="btn btn-sm btn-albedo-primary"
              disabled={locked || saving}
              onClick={() => void save()}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="albedo-ai-muted">No roles</p>
      )}
    </div>
  );
}

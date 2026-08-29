import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { AdminRole } from '../../api/adminApi';
import { authApi } from '../../api/authApi';
import { humanMessage } from '../../api/errors';
import type { Group } from '../../domain/group';
import { toast } from '../../shared/toast/toastStore';
import { PromptDialog } from '../../shared/ui/PromptDialog';
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [cloneOpen, setCloneOpen] = useState(false);

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

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void authApi
      .listGroups()
      .then((items) => {
        if (!cancelled) {
          setGroups(items);
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
  }, [visible]);

  useEffect(() => {
    if (!selectedId) {
      setAssigned(new Set());
      return;
    }
    let cancelled = false;
    void adminApi
      .listRoleGroups(selectedId)
      .then((ids) => {
        if (!cancelled) {
          setAssigned(new Set(ids));
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
  }, [selectedId]);

  const selected = roles.find((role) => role.id === selectedId) ?? null;
  const locked = selected ? isSystemAdmin(selected) : true;
  const mask = draftMask ?? selected?.capabilityMask ?? 0;

  const clone = async (name: string): Promise<void> => {
    if (!selected) {
      return;
    }
    try {
      await adminApi.cloneRole(selected.id, name);
      toast('Saved', 'ok');
      await load(null);
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const toggleGroup = async (groupId: string): Promise<void> => {
    if (!selected) {
      return;
    }
    const next = !assigned.has(groupId);
    setAssigned((current) => {
      const copy = new Set(current);
      if (next) {
        copy.add(groupId);
      } else {
        copy.delete(groupId);
      }
      return copy;
    });
    try {
      if (next) {
        await adminApi.assignGroupRole(groupId, selected.id);
      } else {
        await adminApi.removeGroupRole(groupId, selected.id);
      }
    } catch (err) {
      toast(humanMessage(err));
      const ids = await adminApi.listRoleGroups(selected.id).catch(() => [...assigned]);
      setAssigned(new Set(ids));
    }
  };

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
      <div className="albedo-admin-role-toolbar">
        <button
          type="button"
          className="btn btn-sm btn-albedo-primary"
          disabled={!selected}
          onClick={() => setCloneOpen(true)}
        >
          New from selected
        </button>
      </div>
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
          <div className="albedo-admin-role-groups">
            <p className="albedo-admin-role-groups-title">Groups</p>
            {groups.map((group) => {
              const id = `role-group-${selected.id}-${group.id}`;
              return (
                <label key={group.id} className="form-check albedo-settings-check" htmlFor={id}>
                  <input
                    id={id}
                    className="form-check-input"
                    type="checkbox"
                    checked={assigned.has(group.id)}
                    onChange={() => void toggleGroup(group.id)}
                  />
                  <span className="form-check-label">{group.name}</span>
                </label>
              );
            })}
          </div>
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
      <PromptDialog
        open={cloneOpen}
        title="New from selected"
        label="Name"
        confirmLabel="Create"
        onClose={() => setCloneOpen(false)}
        onSubmit={(name) => {
          void clone(name);
        }}
      />
    </div>
  );
}

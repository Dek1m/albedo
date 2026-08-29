import { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { AdminRole } from '../../api/adminApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Window } from '../../shared/ui/Window';

export type DirectoryGroupMode = { kind: 'create'; ouId: string } | { kind: 'edit'; groupId: string; name: string };

interface DirectoryGroupWindowProps {
  mode: DirectoryGroupMode | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function DirectoryGroupWindow({
  mode,
  canEdit,
  onClose,
  onSaved,
}: DirectoryGroupWindowProps): ReactElement {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [catalog, setCatalog] = useState<AdminRole[]>([]);
  const [assigned, setAssigned] = useState<AdminRole[]>([]);
  const [pick, setPick] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const creating = mode?.kind === 'create';

  useEffect(() => {
    setName(mode?.kind === 'edit' ? mode.name : '');
    setDescription('');
    setAssigned([]);
    setPick('');
    setChosen(null);
    if (!mode) {
      return;
    }
    let cancelled = false;
    void adminApi
      .listRoles()
      .then(async (roles) => {
        if (cancelled) {
          return;
        }
        setCatalog(roles);
        if (mode.kind !== 'edit') {
          return;
        }
        const ids = new Set(await adminApi.listGroupRoles(mode.groupId));
        if (!cancelled) {
          setAssigned(roles.filter((role) => ids.has(role.id)));
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
  }, [mode]);

  const available = catalog.filter((role) => !assigned.some((item) => item.id === role.id));

  const addRole = (): void => {
    const role = catalog.find((item) => item.id === pick);
    if (!role) {
      return;
    }
    setAssigned((current) => [...current, role]);
    setPick('');
  };

  const removeRole = (): void => {
    if (!chosen) {
      return;
    }
    setAssigned((current) => current.filter((item) => item.id !== chosen));
    setChosen(null);
  };

  const save = async (): Promise<void> => {
    if (!mode || !name.trim() || !canEdit) {
      return;
    }
    setSaving(true);
    try {
      let groupId = mode.kind === 'edit' ? mode.groupId : null;
      if (mode.kind === 'create') {
        groupId = await adminApi.createGroupInOu(name.trim(), mode.ouId, description || undefined);
      } else {
        await adminApi.renameGroup(mode.groupId, name.trim());
      }
      if (groupId) {
        const current = new Set(mode.kind === 'edit' ? await adminApi.listGroupRoles(groupId) : []);
        const wanted = new Set(assigned.map((role) => role.id));
        for (const roleId of wanted) {
          if (!current.has(roleId)) {
            await adminApi.assignGroupRole(groupId, roleId);
          }
        }
        for (const roleId of current) {
          if (!wanted.has(roleId)) {
            await adminApi.removeGroupRole(groupId, roleId);
          }
        }
      }
      toast('Saved', 'ok');
      onSaved();
      onClose();
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    void save();
  };

  return (
    <Window
      className="albedo-settings"
      windowId="albedo-admin-group"
      open={Boolean(mode)}
      title={creating ? 'New group' : 'Group'}
      onClose={onClose}
    >
      <form className="albedo-settings-form" onSubmit={submit}>
        <label className="form-label" htmlFor="albedo-dir-group-name">
          Name
        </label>
        <input
          id="albedo-dir-group-name"
          className="form-control form-control-sm"
          disabled={!canEdit || saving}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="form-label" htmlFor="albedo-dir-group-desc">
          Description
        </label>
        <textarea
          id="albedo-dir-group-desc"
          className="form-control form-control-sm"
          rows={2}
          disabled={!canEdit || saving}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <label className="form-label" htmlFor="albedo-dir-group-roles">
          Roles
        </label>
        <select
          id="albedo-dir-group-roles"
          className="form-select form-select-sm"
          multiple
          size={6}
          disabled={!canEdit || saving}
          value={chosen ? [chosen] : []}
          onChange={(event) => setChosen(event.target.value || null)}
        >
          {assigned.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <div className="albedo-member-actions">
          <select
            className="form-select form-select-sm"
            disabled={!canEdit || saving}
            value={pick}
            onChange={(event) => setPick(event.target.value)}
          >
            <option value="">Add role…</option>
            {available.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-sm btn-albedo-primary" disabled={!canEdit || !pick} onClick={addRole}>
            Add
          </button>
          <button type="button" className="btn btn-sm albedo-ghost-btn" disabled={!canEdit || !chosen} onClick={removeRole}>
            Remove
          </button>
        </div>
        <div className="albedo-confirm-actions">
          <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={!canEdit || !name.trim() || saving}>
            {creating ? 'Create' : 'Save'}
          </button>
        </div>
      </form>
    </Window>
  );
}

import { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { AdminRole } from '../../api/adminApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { RoleEditWindow } from './RoleEditWindow';
import { RolePickDialog } from './RolePickDialog';

export type DirectoryGroupMode = { kind: 'create'; ouId: string } | { kind: 'edit'; groupId: string; name: string };

interface DirectoryGroupPaneProps {
  mode: DirectoryGroupMode;
  canEdit: boolean;
  canEditRoles: boolean;
  onSaved: (groupId: string | null, name: string) => void;
}

export function DirectoryGroupPane({
  mode,
  canEdit,
  canEditRoles,
  onSaved,
}: DirectoryGroupPaneProps): ReactElement {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [catalog, setCatalog] = useState<AdminRole[]>([]);
  const [assigned, setAssigned] = useState<AdminRole[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const creating = mode.kind === 'create';

  useEffect(() => {
    setName(mode.kind === 'edit' ? mode.name : '');
    setDescription('');
    setAssigned([]);
    setChosen(null);
    setPickOpen(false);
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

  const addRole = (role: AdminRole): void => {
    setAssigned((current) => (current.some((item) => item.id === role.id) ? current : [...current, role]));
    setPickOpen(false);
  };

  const removeRole = (): void => {
    if (!chosen) {
      return;
    }
    setAssigned((current) => current.filter((item) => item.id !== chosen));
    setChosen(null);
  };

  const save = async (): Promise<void> => {
    if (!name.trim() || !canEdit) {
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
      onSaved(groupId, name.trim());
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
    <div className="albedo-admin-inspector">
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
          size={8}
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
          <button
            type="button"
            className="btn btn-sm btn-albedo-primary"
            disabled={!canEdit || saving}
            onClick={() => setPickOpen(true)}
          >
            Add
          </button>
          <button type="button" className="btn btn-sm albedo-ghost-btn" disabled={!canEdit || !chosen} onClick={removeRole}>
            Delete
          </button>
        </div>
        <div className="albedo-confirm-actions">
          <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={!canEdit || !name.trim() || saving}>
            {creating ? 'Create' : 'Save'}
          </button>
        </div>
      </form>
      <RolePickDialog
        open={pickOpen}
        roles={available}
        canEditRoles={canEditRoles}
        onClose={() => setPickOpen(false)}
        onAdd={addRole}
        onEdit={(roleId) => setEditRoleId(roleId)}
      />
      <RoleEditWindow
        roleId={editRoleId}
        canEdit={canEditRoles}
        onClose={() => setEditRoleId(null)}
        onSaved={(role) => {
          setCatalog((current) => current.map((item) => (item.id === role.id ? role : item)));
          setAssigned((current) => current.map((item) => (item.id === role.id ? role : item)));
        }}
      />
    </div>
  );
}

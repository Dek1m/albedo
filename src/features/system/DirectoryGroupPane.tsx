import { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { systemApi } from '../../api/systemApi';
import type { AdminRole } from '../../api/systemApi';
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
  const groupId = mode.kind === 'edit' ? mode.groupId : null;
  const ouId = mode.kind === 'create' ? mode.ouId : null;
  const groupName = mode.kind === 'edit' ? mode.name : '';

  useEffect(() => {
    setName(groupName);
    setDescription('');
    setAssigned([]);
    setChosen(null);
    setPickOpen(false);
    let cancelled = false;
    void systemApi
      .listRoles()
      .then(async (roles) => {
        if (cancelled) {
          return;
        }
        setCatalog(roles);
        if (!groupId) {
          return;
        }
        const ids = new Set(await systemApi.listGroupRoles(groupId));
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
  }, [groupId, ouId, groupName]);

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
        groupId = await systemApi.createGroupInOu(name.trim(), mode.ouId, description || undefined);
      } else {
        await systemApi.renameGroup(mode.groupId, name.trim());
      }
      if (groupId) {
        const current = new Set(mode.kind === 'edit' ? await systemApi.listGroupRoles(groupId) : []);
        const wanted = new Set(assigned.map((role) => role.id));
        for (const roleId of wanted) {
          if (!current.has(roleId)) {
            await systemApi.assignGroupRole(groupId, roleId);
          }
        }
        for (const roleId of current) {
          if (!wanted.has(roleId)) {
            await systemApi.removeGroupRole(groupId, roleId);
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
        <ul id="albedo-dir-group-roles" className="list-group albedo-admin-listbox">
          {assigned.map((role) => (
            <li
              key={role.id}
              className={`list-group-item${chosen === role.id ? ' active' : ''}`}
              onClick={() => setChosen(role.id)}
            >
              <i className={`bi ${role.isBuiltin ? 'bi-shield-fill' : 'bi-shield'}`} />
              <span>{role.name}</span>
            </li>
          ))}
        </ul>
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

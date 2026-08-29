import { useState } from 'react';
import type { ReactElement } from 'react';
import type { AdminRole } from '../../api/adminApi';
import { Window } from '../../shared/ui/Window';

interface RolePickDialogProps {
  open: boolean;
  roles: AdminRole[];
  canEditRoles: boolean;
  onClose: () => void;
  onAdd: (role: AdminRole) => void;
  onEdit: (roleId: string) => void;
}

export function RolePickDialog({
  open,
  roles,
  canEditRoles,
  onClose,
  onAdd,
  onEdit,
}: RolePickDialogProps): ReactElement {
  const [chosen, setChosen] = useState<string | null>(null);
  const selected = roles.find((role) => role.id === chosen) ?? null;

  return (
    <Window
      className="albedo-admin"
      windowId="albedo-admin-role-pick"
      open={open}
      title="Add role"
      onClose={onClose}
    >
      <table className="table table-sm table-hover">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr
              key={role.id}
              className={chosen === role.id ? 'table-active' : undefined}
              onClick={() => setChosen(role.id)}
              onDoubleClick={() => onAdd(role)}
            >
              <td>
                <i className={`bi ${role.isBuiltin ? 'bi-shield-fill' : 'bi-shield'}`} /> {role.name}
              </td>
              <td>{role.description || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="albedo-confirm-actions">
        <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-sm albedo-ghost-btn"
          disabled={!canEditRoles || !selected}
          onClick={() => {
            if (selected) {
              onEdit(selected.id);
            }
          }}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-sm btn-albedo-primary"
          disabled={!selected}
          onClick={() => {
            if (selected) {
              onAdd(selected);
            }
          }}
        >
          Add
        </button>
      </div>
    </Window>
  );
}

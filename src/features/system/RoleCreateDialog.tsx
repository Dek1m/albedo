import { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { systemApi } from '../../api/systemApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Window } from '../../shared/ui/Window';
import { RoleCapTable } from './RoleCapTable';
import { maskForModules, ROLE_MODULES } from './roleCaps';

interface RoleCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (roleId: string) => void;
}

export function RoleCreateDialog({ open, onClose, onCreated }: RoleCreateDialogProps): ReactElement {
  const [name, setName] = useState('');
  const [modules, setModules] = useState<Set<string>>(new Set());
  const [mask, setMask] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName('');
    setMask(0);
    setModules(new Set());
    setSaving(false);
  }, [open]);

  const toggleModule = (id: string): void => {
    setModules((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    setSaving(true);
    try {
      const created = await systemApi.createRole(name.trim(), maskForModules(mask, modules));
      toast('Saved', 'ok');
      onCreated(created ?? '');
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
      windowId="albedo-admin-role-create"
      parentId="albedo-admin"
      open={open}
      title="New role"
      onClose={onClose}
    >
      <form className="albedo-settings-form" onSubmit={(event) => void submit(event)}>
        <label className="form-label" htmlFor="albedo-role-create-name">
          Name
        </label>
        <input
          id="albedo-role-create-name"
          className="form-control form-control-sm"
          value={name}
          disabled={saving}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="form-label">Modules</p>
        {ROLE_MODULES.map((module) => (
          <label key={module.id} className="form-check albedo-settings-check" htmlFor={`mod-${module.id}`}>
            <input
              id={`mod-${module.id}`}
              className="form-check-input"
              type="checkbox"
              checked={modules.has(module.id)}
              disabled={saving}
              onChange={() => toggleModule(module.id)}
            />
            <span className="form-check-label">{module.label}</span>
          </label>
        ))}
        <RoleCapTable modules={modules} mask={mask} disabled={saving} onChange={setMask} />
        <div className="albedo-confirm-actions">
          <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={!name.trim() || saving}>
            Create
          </button>
        </div>
      </form>
    </Window>
  );
}

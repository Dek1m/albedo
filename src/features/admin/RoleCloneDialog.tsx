import { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { AdminRole } from '../../api/adminApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Window } from '../../shared/ui/Window';
import { bitOn, CRUD, maskForModules, modulesFromMask, ROLE_MODULES, toggleBit } from './roleCaps';

interface RoleCloneDialogProps {
  open: boolean;
  source: AdminRole | null;
  onClose: () => void;
  onCreated: (roleId: string) => void;
}

export function RoleCloneDialog({ open, source, onClose, onCreated }: RoleCloneDialogProps): ReactElement {
  const [name, setName] = useState('');
  const [modules, setModules] = useState<Set<string>>(new Set());
  const [mask, setMask] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName('');
    setMask(source?.capabilityMask ?? 0);
    setModules(modulesFromMask(source?.capabilityMask ?? 0));
  }, [open, source]);

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
    if (!source || !name.trim()) {
      return;
    }
    setSaving(true);
    try {
      const created = await adminApi.cloneRole(source.id, name.trim());
      const nextMask = maskForModules(mask, modules);
      if (created) {
        await adminApi.upsertRoleMask(created, nextMask);
      }
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
      windowId="albedo-admin-role-clone"
      open={open}
      title="New from selected"
      onClose={onClose}
    >
      <form className="albedo-settings-form" onSubmit={(event) => void submit(event)}>
        <label className="form-label" htmlFor="albedo-role-clone-name">
          Name
        </label>
        <input
          id="albedo-role-clone-name"
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
        <div className="albedo-admin-caps">
          {ROLE_MODULES.filter((module) => modules.has(module.id)).map((module) =>
            module.entities.map((entity) => (
              <fieldset key={`${module.id}-${entity.label}`} className="albedo-admin-cap-group" disabled={saving}>
                <legend>{entity.label}</legend>
                {CRUD.map((label, index) => {
                  const bit = entity.shift + index;
                  const id = `clone-cap-${entity.label}-${String(bit)}`;
                  return (
                    <label key={label} className="form-check albedo-settings-check" htmlFor={id}>
                      <input
                        id={id}
                        className="form-check-input"
                        type="checkbox"
                        checked={bitOn(mask, bit)}
                        onChange={() => setMask(toggleBit(mask, bit))}
                      />
                      <span className="form-check-label">{label}</span>
                    </label>
                  );
                })}
              </fieldset>
            )),
          )}
        </div>
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

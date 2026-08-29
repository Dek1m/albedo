import { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import type { DomainOu } from '../../api/adminApi';
import { adminApi } from '../../api/adminApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';

interface DirectoryOuPaneProps {
  ou: DomainOu;
  canEdit: boolean;
  onSaved: () => void;
}

export function DirectoryOuPane({ ou, canEdit, onSaved }: DirectoryOuPaneProps): ReactElement {
  const [name, setName] = useState(ou.name);
  const [saving, setSaving] = useState(false);
  const locked = ou.isSystem || !canEdit;

  useEffect(() => {
    setName(ou.name);
  }, [ou.id, ou.name]);

  const save = async (): Promise<void> => {
    if (locked || !name.trim() || name.trim() === ou.name) {
      return;
    }
    setSaving(true);
    try {
      await adminApi.renameOu(ou.id, name.trim());
      toast('Saved', 'ok');
      onSaved();
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
        <label className="form-label" htmlFor="albedo-dir-ou-name">
          Name
        </label>
        <input
          id="albedo-dir-ou-name"
          className="form-control form-control-sm"
          disabled={locked || saving}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="form-label" htmlFor="albedo-dir-ou-kind">
          Type
        </label>
        <input id="albedo-dir-ou-kind" className="form-control form-control-sm" disabled value={ou.kind} />
        <div className="albedo-confirm-actions">
          <button
            type="submit"
            className="btn btn-sm btn-albedo-primary"
            disabled={locked || saving || !name.trim() || name.trim() === ou.name}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

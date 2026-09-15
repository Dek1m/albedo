import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { systemApi } from '../../api/systemApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Window } from '../../shared/ui/Window';
import { domainSlugError } from './domainSlug';

interface CreateDomainDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateDomainDialog({ open, onClose, onCreated }: CreateDomainDialogProps): ReactElement {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Сброс формы при открытии: храним предыдущее значение, чистим во время рендера,
  // а не в useEffect (react-hooks/set-state-in-effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    setName('');
    setDisplayName('');
    setError(null);
    setSaving(false);
  }

  const submit = async (): Promise<void> => {
    const slug = name.trim();
    const slugError = domainSlugError(slug);
    const label = displayName.trim();
    if (slugError) {
      setError(slugError);
      return;
    }
    if (!label) {
      setError('Display name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await systemApi.createDomain(slug, label);
      toast('Domain created', 'ok');
      onCreated();
      onClose();
    } catch (err) {
      // Дубль слага и прочие ошибки бэка показываем в форме, окно не закрываем.
      setError(humanMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Window
      className="albedo-settings"
      windowId="albedo-admin-domain-create"
      parentId="albedo-admin"
      open={open}
      title="Create domain"
      onClose={onClose}
    >
      <form
        className="albedo-settings-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="form-label" htmlFor="albedo-domain-create-name">
          Name
        </label>
        <input
          id="albedo-domain-create-name"
          className="form-control form-control-sm"
          value={name}
          disabled={saving}
          placeholder="acme"
          onChange={(event) => setName(event.target.value.toLowerCase())}
        />
        <label className="form-label" htmlFor="albedo-domain-create-display">
          Display name
        </label>
        <input
          id="albedo-domain-create-display"
          className="form-control form-control-sm"
          value={displayName}
          disabled={saving}
          placeholder="Acme Corp"
          onChange={(event) => setDisplayName(event.target.value)}
        />
        {error ? <p className="albedo-field-error">{error}</p> : null}
        <div className="albedo-confirm-actions">
          <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={saving}>
            Create
          </button>
        </div>
      </form>
    </Window>
  );
}

import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { Window } from '../../shared/ui/Window';

interface CreateUserDialogProps {
  open: boolean;
  title?: string;
  onSubmit: (input: { username: string; password: string }) => void;
  onClose: () => void;
}

export function CreateUserDialog({
  open,
  title = 'Создать пользователя',
  onSubmit,
  onClose,
}: CreateUserDialogProps): ReactElement {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const close = (): void => {
    setUsername('');
    setPassword('');
    onClose();
  };

  const ready = Boolean(username.trim() && password);

  const submit = (event?: FormEvent): void => {
    event?.preventDefault();
    if (!ready) {
      return;
    }
    onSubmit({ username: username.trim(), password });
    close();
  };

  return (
    <Window className="albedo-prompt" windowId="albedo-admin-user" open={open} title={title} onClose={close}>
      <form className="albedo-settings-form" onSubmit={submit}>
        <label className="form-label" htmlFor="albedo-admin-username">
          Username
        </label>
        <input
          id="albedo-admin-username"
          className="form-control form-control-sm"
          autoFocus
          autoComplete="off"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <label className="form-label" htmlFor="albedo-admin-password">
          Password
        </label>
        <input
          id="albedo-admin-password"
          className="form-control form-control-sm"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="albedo-confirm-actions">
          <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={!ready}>
            Create
          </button>
        </div>
      </form>
    </Window>
  );
}

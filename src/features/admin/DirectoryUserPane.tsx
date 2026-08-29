import { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { DirectoryUser } from '../../api/adminApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { readImageFile } from '../../shared/ui/readImageFile';
import { DirectoryMemberOf } from './DirectoryMemberOf';
import { DirectoryUserForm, EMPTY_DRAFT } from './DirectoryUserForm';
import type { DirectoryUserDraft } from './DirectoryUserForm';

type Pane = 'general' | 'memberOf';

export type DirectoryUserMode = { kind: 'create'; ouId: string } | { kind: 'edit'; userId: string };

interface DirectoryUserPaneProps {
  mode: DirectoryUserMode;
  canEdit: boolean;
  onSaved: (userId: string | null) => void;
}

function fromUser(user: DirectoryUser): DirectoryUserDraft {
  return {
    username: user.username,
    nickname: user.nickname,
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: user.dateOfBirth,
    email: user.email,
    phone: user.phone,
    userPrompt: user.userPrompt,
    chipDisplayMode: user.chipDisplayMode,
  };
}

export function DirectoryUserPane({ mode, canEdit, onSaved }: DirectoryUserPaneProps): ReactElement {
  const [pane, setPane] = useState<Pane>('general');
  const [draft, setDraft] = useState<DirectoryUserDraft>(EMPTY_DRAFT);
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const creating = mode.kind === 'create';
  const userId = mode.kind === 'edit' ? mode.userId : null;
  const ouId = mode.kind === 'create' ? mode.ouId : null;

  useEffect(() => {
    setPane('general');
    setDraft(EMPTY_DRAFT);
    setPassword('');
    setAvatarUrl(null);
    if (!userId) {
      return;
    }
    let cancelled = false;
    void adminApi
      .getDirectoryUser(userId)
      .then((user) => {
        if (!cancelled && user) {
          setDraft(fromUser(user));
          setAvatarUrl(user.avatarUrl);
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
  }, [userId, ouId]);

  const patch = (next: Partial<DirectoryUserDraft>): void => {
    setDraft((current) => ({ ...current, ...next }));
  };

  const save = async (): Promise<void> => {
    if (!draft.username.trim() || !canEdit) {
      return;
    }
    if (creating && !password) {
      return;
    }
    setSaving(true);
    try {
      if (mode.kind === 'create') {
        const created = await adminApi.createUserInOu({
          username: draft.username.trim(),
          password,
          email: draft.email || undefined,
          ouId: mode.ouId,
        });
        if (created) {
          await adminApi.updateDirectoryUser(created, { ...draft, username: draft.username.trim() });
        }
        toast('Saved', 'ok');
        onSaved(created);
      } else {
        await adminApi.updateDirectoryUser(mode.userId, { ...draft, username: draft.username.trim() });
        toast('Saved', 'ok');
        onSaved(mode.userId);
      }
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

  const ready = Boolean(draft.username.trim() && (!creating || password));

  return (
    <div className="albedo-admin-inspector">
      <ul className="nav nav-tabs mb-2">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${pane === 'general' ? ' active' : ''}`}
            onClick={() => setPane('general')}
          >
            General
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${pane === 'memberOf' ? ' active' : ''}`}
            disabled={!userId}
            onClick={() => setPane('memberOf')}
          >
            Member Of
          </button>
        </li>
      </ul>
      {pane === 'general' ? (
        <form className="albedo-settings-form" onSubmit={submit}>
          <DirectoryUserForm
            values={draft}
            onChange={patch}
            showPassword={creating}
            password={password}
            onPassword={setPassword}
            disabled={!canEdit || saving}
            avatarUrl={avatarUrl}
            onAvatar={
              userId
                ? (file) => {
                    void (async () => {
                      try {
                        const packed = await readImageFile(file);
                        const url = await adminApi.setDirectoryAvatar(userId, packed.imageB64, packed.contentType);
                        setAvatarUrl(`${url}&t=${String(Date.now())}`);
                        toast('Saved', 'ok');
                      } catch (err) {
                        toast(humanMessage(err));
                      }
                    })();
                  }
                : undefined
            }
          />
          <div className="albedo-confirm-actions">
            <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={!canEdit || !ready || saving}>
              {creating ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      ) : userId ? (
        <DirectoryMemberOf userId={userId} />
      ) : null}
    </div>
  );
}

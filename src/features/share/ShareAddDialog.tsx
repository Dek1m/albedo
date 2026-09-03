import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { fsApi } from '../../api/fsApi';
import type { EntityCandidate, GranteeType, ResolveResult, ShareLevel } from '../../api/fsApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { SafeName } from '../../shared/ui/SafeName';
import { Window } from '../../shared/ui/Window';
import { EVERYONE_CONFIRM, isEveryoneGrant } from './shareable';

interface Picked {
  type: GranteeType;
  id: string;
  name: string;
}

interface ShareAddDialogProps {
  open: boolean;
  path: string;
  onClose: () => void;
  onAdded: () => void;
}

function splitInputs(raw: string): string[] {
  return raw.split(';').map((part) => part.trim()).filter(Boolean);
}

function keyOf(type: string, id: string): string {
  return `${type}:${id}`;
}

export function ShareAddDialog({ open, path, onClose, onAdded }: ShareAddDialogProps): ReactElement {
  const [domain, setDomain] = useState('catalog');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<ShareLevel>('viewer');
  const [busy, setBusy] = useState(false);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [ambiguous, setAmbiguous] = useState<ResolveResult[]>([]);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [choice, setChoice] = useState<Set<string>>(() => new Set());
  const [askEveryone, setAskEveryone] = useState(false);
  const everyoneAccepted = useRef(false);

  const reset = (): void => {
    setQuery('');
    setUnresolved([]);
    setAmbiguous([]);
    setPicked([]);
    setChoice(new Set());
    setAskEveryone(false);
    setLevel('viewer');
  };

  const close = (): void => {
    reset();
    onClose();
  };

  const addPicked = (rows: Picked[]): void => {
    setPicked((current) => {
      const seen = new Set(current.map((row) => keyOf(row.type, row.id)));
      const extra = rows.filter((row) => row.id && !seen.has(keyOf(row.type, row.id)));
      return extra.length ? [...current, ...extra] : current;
    });
  };

  const resolve = async (): Promise<void> => {
    const inputs = splitInputs(query);
    if (!inputs.length) {
      return;
    }
    setBusy(true);
    try {
      const results = await fsApi.resolveEntities(inputs);
      const missed: string[] = [];
      const unclear: ResolveResult[] = [];
      const found: Picked[] = [];
      for (const row of results) {
        if (row.status === 'unresolved') {
          missed.push(row.input);
          continue;
        }
        if (row.status === 'ambiguous') {
          unclear.push(row);
          continue;
        }
        const hit = row.candidates[0];
        if (hit) {
          found.push({ type: hit.type, id: hit.uuid, name: hit.name });
        }
      }
      setUnresolved(missed);
      setAmbiguous(unclear);
      addPicked(found);
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onQueryKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void resolve();
    }
  };

  const applyAmbiguous = (): void => {
    const rows: Picked[] = [];
    for (const group of ambiguous) {
      for (const candidate of group.candidates) {
        if (choice.has(keyOf(candidate.type, candidate.uuid))) {
          rows.push({ type: candidate.type, id: candidate.uuid, name: candidate.name });
        }
      }
    }
    addPicked(rows);
    setAmbiguous([]);
    setChoice(new Set());
  };

  const toggleCandidate = (candidate: EntityCandidate): void => {
    const id = keyOf(candidate.type, candidate.uuid);
    setChoice((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllAmbiguous = (): void => {
    const next = new Set<string>();
    for (const group of ambiguous) {
      for (const candidate of group.candidates) {
        next.add(keyOf(candidate.type, candidate.uuid));
      }
    }
    setChoice(next);
  };

  const commitWith = async (rows: Picked[]): Promise<void> => {
    if (!rows.length) {
      return;
    }
    setBusy(true);
    try {
      await fsApi.shareAdd(
        path,
        rows.map((row) => ({ type: row.type, id: row.id })),
        level,
      );
      reset();
      onAdded();
      onClose();
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (): void => {
    if (!picked.length || busy) {
      return;
    }
    if (picked.some((row) => isEveryoneGrant(row.name, row.type))) {
      everyoneAccepted.current = false;
      setAskEveryone(true);
      return;
    }
    void commitWith(picked);
  };

  return (
    <>
      <Window
        open={open}
        title="Add"
        windowId="albedo-share-add"
        parentId="albedo-share"
        icon="bi-person-plus"
        onClose={close}
      >
        <div className="albedo-share-add">
          <label className="albedo-share-field">
            <span>Домен</span>
            <select
              className="form-select form-select-sm"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              aria-label="domain"
            >
              <option value="catalog">весь каталог</option>
            </select>
          </label>
          <div className="albedo-admin-search albedo-ai-model-search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              className="form-control form-control-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onQueryKey}
              placeholder="uuid / username / email / телефон; несколько через ;"
              aria-label="search identities"
              disabled={busy}
            />
          </div>
          {unresolved.length ? (
            <ul className="albedo-share-missed">
              {unresolved.map((item) => (
                <li key={item}>
                  <SafeName value={item} />
                </li>
              ))}
            </ul>
          ) : null}
          {ambiguous.length ? (
            <div className="albedo-share-ambiguous">
              {ambiguous.map((group) => (
                <div key={group.input} className="albedo-share-amb-group">
                  <p>
                    Неоднозначно: <SafeName value={group.input} />
                  </p>
                  {group.candidates.map((candidate) => {
                    const id = keyOf(candidate.type, candidate.uuid);
                    return (
                      <label key={id} className="albedo-share-choice">
                        <input
                          type="checkbox"
                          checked={choice.has(id)}
                          onChange={() => toggleCandidate(candidate)}
                        />
                        <i className={`bi ${candidate.type === 'group' ? 'bi-people-fill' : 'bi-person'}`} />
                        <SafeName value={candidate.name} />
                        {candidate.email ? <span className="albedo-share-email">{candidate.email}</span> : null}
                      </label>
                    );
                  })}
                </div>
              ))}
              <div className="albedo-share-add-actions">
                <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={selectAllAmbiguous}>
                  Все
                </button>
                <button type="button" className="btn btn-sm btn-albedo-primary" onClick={applyAmbiguous}>
                  ОК
                </button>
              </div>
            </div>
          ) : null}
          {picked.length ? (
            <ul className="albedo-share-picked">
              {picked.map((row) => (
                <li key={keyOf(row.type, row.id)}>
                  <i className={`bi ${row.type === 'group' ? 'bi-people-fill' : 'bi-person'}`} />
                  <SafeName value={row.name} />
                  {isEveryoneGrant(row.name, row.type) ? (
                    <span className="albedo-share-everyone">Everyone</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <label className="albedo-share-field">
            <span>Уровень</span>
            <select
              className="form-select form-select-sm"
              value={level}
              onChange={(event) => setLevel(event.target.value === 'editor' ? 'editor' : 'viewer')}
            >
              <option value="viewer">чтение</option>
              <option value="editor">редактирование</option>
            </select>
          </label>
          <div className="albedo-share-add-actions">
            <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm btn-albedo-primary"
              disabled={!picked.length || busy}
              onClick={onSubmit}
            >
              Add
            </button>
          </div>
        </div>
      </Window>
      <ConfirmDialog
        open={askEveryone}
        title="Everyone"
        body={EVERYONE_CONFIRM}
        confirmLabel="Share"
        onClose={() => {
          setAskEveryone(false);
          if (everyoneAccepted.current) {
            everyoneAccepted.current = false;
            return;
          }
          void commitWith(picked.filter((row) => !isEveryoneGrant(row.name, row.type)));
        }}
        onConfirm={() => {
          everyoneAccepted.current = true;
          void commitWith(picked);
        }}
      />
    </>
  );
}

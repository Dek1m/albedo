import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { systemApi } from '../../api/systemApi';
import type { PrefCatalog, PrefField, PrefModule } from '../../api/systemApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Hint } from '../../shared/ui/Hint';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { Window } from '../../shared/ui/Window';

interface PreferencesWindowProps {
  open: boolean;
  onClose: () => void;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function asBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

function parseField(field: PrefField, raw: string): unknown {
  if (field.kind === 'int') {
    const num = Number.parseInt(raw, 10);
    return Number.isFinite(num) ? num : field.default;
  }
  if (field.kind === 'float') {
    const num = Number.parseFloat(raw);
    return Number.isFinite(num) ? num : field.default;
  }
  return raw;
}

function PrefControl({
  field,
  onCommit,
}: {
  field: PrefField;
  onCommit: (value: unknown) => void;
}): ReactElement {
  const [draft, setDraft] = useState(asText(field.value));

  useEffect(() => {
    setDraft(asText(field.value));
  }, [field.key, field.value]);

  if (field.kind === 'bool') {
    return (
      <label className="form-check albedo-pref-check">
        <input
          className="form-check-input"
          type="checkbox"
          checked={asBool(field.value)}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onCommit(event.target.checked)}
        />
        <span className="form-check-label">{field.label}</span>
      </label>
    );
  }

  if (field.kind === 'enum' && field.options?.length) {
    return (
      <select
        className="form-select"
        value={asText(field.value)}
        onChange={(event) => onCommit(event.target.value)}
      >
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  const inputType = field.kind === 'int' || field.kind === 'float' ? 'number' : 'text';
  return (
    <input
      className="form-control"
      type={inputType}
      value={draft}
      min={field.min}
      max={field.max}
      step={field.kind === 'float' ? 'any' : field.kind === 'int' ? 1 : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = parseField(field, draft);
        if (asText(next) !== asText(field.value)) {
          onCommit(next);
        }
      }}
    />
  );
}

function PrefRow({
  field,
  onCommit,
}: {
  field: PrefField;
  onCommit: (value: unknown) => void;
}): ReactElement {
  return (
    <div className="albedo-pref-row">
      <div className="albedo-pref-label">
        {field.kind === 'bool' ? null : <span>{field.label}</span>}
        <Hint text={field.hint} />
        {field.needsRestart ? <span className="albedo-pref-restart">restart</span> : null}
      </div>
      <PrefControl field={field} onCommit={onCommit} />
    </div>
  );
}

export function PreferencesWindow({ open, onClose }: PreferencesWindowProps): ReactElement {
  const [catalog, setCatalog] = useState<PrefCatalog>({ modules: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void systemApi
      .prefList()
      .then((list) => {
        if (!cancelled) {
          setCatalog(list);
          setSelected((current) => current ?? list.modules[0]?.name ?? null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast(humanMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const current: PrefModule | undefined = catalog.modules.find((mod) => mod.name === selected);

  const commit = async (field: PrefField, value: unknown): Promise<void> => {
    setSaving(field.key);
    try {
      const result = await systemApi.prefSet(field.key, value);
      setCatalog((prev) => ({
        modules: prev.modules.map((mod) => ({
          ...mod,
          groups: mod.groups.map((group) => ({
            ...group,
            fields: group.fields.map((item) => (item.key === field.key ? { ...item, value } : item)),
          })),
        })),
      }));
      if (result.needsRestart) {
        toast('Saved. Restart required', 'info');
      }
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Window className="albedo-admin" windowId="albedo-system-prefs" open={open} title="Preferences" onClose={onClose}>
      {loading && !catalog.modules.length ? (
        <SkeletonList rows={6} />
      ) : (
        <div className="albedo-pref-split">
          <ul className="list-group albedo-admin-listbox albedo-pref-nav">
            {catalog.modules.map((mod) => (
              <li
                key={mod.name}
                className={`list-group-item${selected === mod.name ? ' active' : ''}`}
                onClick={() => setSelected(mod.name)}
              >
                <span>{mod.displayName}</span>
              </li>
            ))}
          </ul>
          <div className="albedo-pref-pane">
            {!current ? (
              <p className="albedo-ai-muted">No preferences yet</p>
            ) : (
              current.groups.map((group) => (
                <section key={group.id} className="albedo-pref-group">
                  <h3>{group.label}</h3>
                  {group.fields.map((field) => (
                    <PrefRow
                      key={field.key}
                      field={field}
                      onCommit={(value) => {
                        if (saving === field.key) {
                          return;
                        }
                        void commit(field, value);
                      }}
                    />
                  ))}
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </Window>
  );
}

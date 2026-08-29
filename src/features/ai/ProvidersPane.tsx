import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { llmApi } from '../../api/llmApi';
import type { LlmProvider, ProviderKind } from '../../api/llmApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { SkeletonList } from '../../shared/ui/Skeleton';

interface ProvidersPaneProps {
  visible: boolean;
}

interface DraftModel {
  id: string;
  name: string;
  enabled: boolean;
}

function matchesQuery(query: string, value: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const v = value.toLowerCase();
  return v === q || v.includes(q);
}

export function ProvidersPane({ visible }: ProvidersPaneProps): ReactElement {
  const [items, setItems] = useState<LlmProvider[]>([]);
  const [busy, setBusy] = useState(true);
  const [kind, setKind] = useState<ProviderKind>('api_key');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.example.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [draft, setDraft] = useState<DraftModel[] | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (): Promise<void> => {
    setBusy(true);
    try {
      setItems(await llmApi.listProviders());
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      return;
    }
    void load();
  }, [visible]);

  const shown = useMemo(
    () => (draft ?? []).filter((item) => matchesQuery(search, item.name) || matchesQuery(search, item.id)),
    [draft, search],
  );

  const resetForm = (): void => {
    setKind('api_key');
    setName('');
    setDescription('');
    setBaseUrl('https://api.example.com/v1');
    setApiKey('');
    setDraft(null);
    setSearch('');
  };

  const probe = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!name.trim() || !baseUrl.trim() || !apiKey.trim()) {
      toast('Имя, адрес и ключ обязательны');
      return;
    }
    setSaving(true);
    try {
      const models = await llmApi.probeModels(baseUrl.trim(), apiKey.trim());
      setDraft(models.map((item) => ({ id: item.id, name: item.name, enabled: true })));
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveApi = async (): Promise<void> => {
    if (!draft) {
      return;
    }
    setSaving(true);
    try {
      await llmApi.createProvider({
        name: name.trim(),
        kind: 'api_key',
        vendor: 'openai',
        description: description.trim() || undefined,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        models: draft.map((item) => ({
          model_id: item.id,
          display_name: item.name,
          enabled: item.enabled,
        })),
      });
      toast('Провайдер сохранён', 'ok');
      resetForm();
      await load();
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveOauth = async (): Promise<void> => {
    if (!name.trim()) {
      toast('Имя обязательно');
      return;
    }
    setSaving(true);
    try {
      const oauth = await llmApi.startOauth('grok');
      await llmApi.createProvider({
        name: name.trim(),
        kind: 'oauth',
        vendor: 'grok',
        description: description.trim() || undefined,
        baseUrl: 'https://api.x.ai/v1',
      });
      toast(
        oauth.status === 'pending_client'
          ? 'Grok сохранён. OAuth: auth.x.ai / device code — нужен client_id приложения'
          : oauth.status,
        'info',
      );
      resetForm();
      await load();
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleSaved = async (provider: LlmProvider, modelId: string, enabled: boolean): Promise<void> => {
    try {
      await llmApi.setModelEnabled(modelId, enabled);
      setItems((current) =>
        current.map((item) =>
          item.id === provider.id
            ? {
                ...item,
                models: item.models.map((model) => (model.id === modelId ? { ...model, enabled } : model)),
              }
            : item,
        ),
      );
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  if (busy) {
    return <SkeletonList rows={5} />;
  }

  return (
    <div className="albedo-ai-providers-pane">
      <div className="albedo-ai-provider-strips">
        {items.length === 0 ? (
          <p className="albedo-ai-muted">Провайдеров пока нет.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="albedo-ai-provider-strip">
              <header className="albedo-ai-provider-strip-head">
                <strong>{item.name}</strong>
                <span className="albedo-ai-muted">{item.kind === 'oauth' ? 'OAuth · Grok' : 'API'}</span>
              </header>
              <p className="albedo-ai-provider-desc">{item.description || '—'}</p>
              <ul className="albedo-ai-provider-models">
                {item.models.filter((model) => model.enabled).length === 0 ? (
                  <li className="albedo-ai-muted">Модели не включены</li>
                ) : (
                  item.models
                    .filter((model) => model.enabled)
                    .map((model) => (
                      <li key={model.id}>
                        <Switch
                          on={model.enabled}
                          onChange={(next) => void toggleSaved(item, model.id, next)}
                        />
                        <span>{model.displayName}</span>
                      </li>
                    ))
                )}
              </ul>
            </article>
          ))
        )}
      </div>

      <form className="albedo-ai-form albedo-ai-provider-form" onSubmit={(event) => void (kind === 'api_key' ? probe(event) : (event.preventDefault(), saveOauth()))}>
        <label className="form-label" htmlFor="ai-prov-type">
          Type
        </label>
        <select
          id="ai-prov-type"
          className="form-select form-select-sm"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as ProviderKind);
            setDraft(null);
          }}
        >
          <option value="api_key">API</option>
          <option value="oauth">OAuth</option>
        </select>

        <label className="form-label" htmlFor="ai-prov-name">
          Name
        </label>
        <input
          id="ai-prov-name"
          className="form-control form-control-sm"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="example"
        />

        <label className="form-label" htmlFor="ai-prov-desc">
          Description
        </label>
        <input
          id="ai-prov-desc"
          className="form-control form-control-sm"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="OpenAI-compatible lab"
        />

        {kind === 'oauth' ? (
          <>
            <p className="albedo-ai-muted">
              Как Grok Build: вход через браузер на auth.x.ai (PKCE) или device code, если браузера нет. SPA не
              открывает loopback-порт CLI — Connect сохранит провайдера и дождётся client_id приложения.
            </p>
            <div className="albedo-ai-actions">
              <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={saving || !name.trim()}>
                Connect Grok
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="form-label" htmlFor="ai-prov-url">
              Address
            </label>
            <input
              id="ai-prov-url"
              className="form-control form-control-sm"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.example.com/v1/"
            />
            <label className="form-label" htmlFor="ai-prov-key">
              API Key
            </label>
            <input
              id="ai-prov-key"
              className="form-control form-control-sm"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
            />
            {draft === null ? (
              <div className="albedo-ai-actions">
                <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={saving}>
                  Check
                </button>
              </div>
            ) : (
              <>
                <div className="albedo-ai-model-search">
                  <i className="bi bi-search" aria-hidden="true" />
                  <input
                    className="form-control form-control-sm"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="поиск модели"
                    aria-label="поиск модели"
                  />
                </div>
                <ul className="albedo-ai-model-pick">
                  {shown.map((item) => (
                    <li key={item.id}>
                      <Switch
                        on={item.enabled}
                        onChange={(next) =>
                          setDraft((current) =>
                            (current ?? []).map((row) => (row.id === item.id ? { ...row, enabled: next } : row)),
                          )
                        }
                      />
                      <span>{item.name}</span>
                    </li>
                  ))}
                </ul>
                <div className="albedo-ai-actions">
                  <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={() => setDraft(null)}>
                    Back
                  </button>
                  <button type="button" className="btn btn-sm btn-albedo-primary" disabled={saving} onClick={() => void saveApi()}>
                    Save
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </form>
    </div>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }): ReactElement {
  return (
    <button
      type="button"
      className={`albedo-switch${on ? ' is-on' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <span className="albedo-switch-knob" />
    </button>
  );
}

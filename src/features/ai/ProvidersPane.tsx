import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { llmApi, urlError } from '../../api/llmApi';
import type { LlmProvider, ProviderKind, ReasoningEffort } from '../../api/llmApi';
import { ApiError, humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { SkeletonList } from '../../shared/ui/Skeleton';

interface ProvidersPaneProps {
  visible: boolean;
}

interface DraftModel {
  id: string;
  name: string;
  customName: string;
  enabled: boolean;
  supportsReasoning: boolean;
  reasoningEnabled: boolean;
  reasoningEffort: ReasoningEffort;
}

const EFFORTS: ReasoningEffort[] = ['none', 'low', 'medium', 'high'];

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
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [draft, setDraft] = useState<DraftModel[] | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probeUrlError, setProbeUrlError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  const urlHint = (kind === 'api_key' && baseUrl.trim() ? urlError(baseUrl) : null) ?? probeUrlError;
  const canProbe = kind === 'api_key' && !urlError(baseUrl) && Boolean(apiKey.trim());
  const showCatalog = Boolean(draft) || probing;

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

  useEffect(() => {
    if (!canProbe) {
      setDraft(null);
      setProbeUrlError(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setProbing(true);
      setProbeUrlError(null);
      void llmApi
        .probeModels(baseUrl.trim(), apiKey.trim())
        .then((models) => {
          setDraft(
            models.map((item) => ({
              id: item.id,
              name: item.name,
              customName: '',
              enabled: false,
              supportsReasoning: item.supportsReasoning,
              reasoningEnabled: false,
              reasoningEffort: 'medium',
            })),
          );
        })
        .catch((err: unknown) => {
          setDraft(null);
          const code = err instanceof ApiError ? err.code : '';
          if (code === 'WRONG_URL' || code === 'UPSTREAM') {
            setProbeUrlError('Wrong URL');
            return;
          }
          toast(humanMessage(err));
        })
        .finally(() => setProbing(false));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [canProbe, baseUrl, apiKey]);

  const shown = useMemo(
    () =>
      (draft ?? []).filter(
        (item) =>
          matchesQuery(search, item.name) ||
          matchesQuery(search, item.id) ||
          matchesQuery(search, item.customName),
      ),
    [draft, search],
  );
  const draftAllOn = Boolean(shown.length) && shown.every((item) => item.enabled);

  const resetForm = (): void => {
    setKind('api_key');
    setName('');
    setDescription('');
    setBaseUrl('');
    setApiKey('');
    setDraft(null);
    setSearch('');
    setEditId(null);
    setProbeUrlError(null);
  };

  const startEdit = (provider: LlmProvider): void => {
    setEditId(provider.id);
    setKind(provider.kind);
    setName(provider.name);
    setDescription(provider.description ?? '');
    setBaseUrl(provider.baseUrl ?? '');
    setApiKey('');
    setDraft(null);
    setSearch('');
    setOpenIds((current) => (current.includes(provider.id) ? current : [...current, provider.id]));
  };

  const saveApi = async (): Promise<void> => {
    if (!name.trim()) {
      toast('Name is required');
      return;
    }
    if (editId) {
      setSaving(true);
      try {
        const updated = await llmApi.updateProvider({
          providerId: editId,
          name: name.trim(),
          description: description.trim() || undefined,
          baseUrl: baseUrl.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
        });
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast('Provider updated', 'ok');
        resetForm();
      } catch (err) {
        toast(humanMessage(err));
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!draft || !canProbe) {
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
        models: draft
          .filter((item) => item.enabled)
          .map((item) => ({
            model_id: item.id,
            display_name: item.customName.trim() || item.id,
            enabled: true,
            supports_reasoning: item.supportsReasoning,
            reasoning_enabled: item.reasoningEnabled,
            reasoning_effort: item.supportsReasoning ? item.reasoningEffort : null,
          })),
      });
      toast('Provider saved', 'ok');
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
      toast('Name is required');
      return;
    }
    setSaving(true);
    try {
      const vendor = name.trim().toLowerCase().replace(/\s+/g, '-');
      await llmApi.startOauth(vendor);
      await llmApi.createProvider({
        name: name.trim(),
        kind: 'oauth',
        vendor,
        description: description.trim() || undefined,
      });
      toast('OAuth saved. App client_id is required to finish sign-in.', 'info');
      resetForm();
      await load();
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeModel = async (providerId: string, modelId: string): Promise<void> => {
    try {
      await llmApi.deleteModel(modelId);
      setItems((current) =>
        current.map((item) =>
          item.id === providerId
            ? { ...item, models: item.models.filter((model) => model.id !== modelId) }
            : item,
        ),
      );
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const remove = async (providerId: string): Promise<void> => {
    try {
      await llmApi.deleteProvider(providerId);
      setItems((current) => current.filter((item) => item.id !== providerId));
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const toggleOpen = (providerId: string): void => {
    setOpenIds((current) =>
      current.includes(providerId) ? current.filter((id) => id !== providerId) : [...current, providerId],
    );
  };

  const toggleAllDraft = (enabled: boolean): void => {
    const ids = new Set(shown.map((item) => item.id));
    setDraft((current) =>
      (current ?? []).map((row) => (ids.has(row.id) ? { ...row, enabled } : row)),
    );
  };

  const toggleAllSaved = async (provider: LlmProvider, enabled: boolean): Promise<void> => {
    try {
      await llmApi.setProviderModelsEnabled(provider.id, enabled);
      setItems((current) =>
        current.map((item) =>
          item.id === provider.id
            ? { ...item, models: item.models.map((model) => ({ ...model, enabled })) }
            : item,
        ),
      );
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const renameSaved = async (providerId: string, modelId: string, displayName: string): Promise<void> => {
    const value = displayName.trim();
    if (!value) {
      return;
    }
    try {
      await llmApi.setModelName(modelId, value);
      setItems((current) =>
        current.map((item) =>
          item.id === providerId
            ? {
                ...item,
                models: item.models.map((model) =>
                  model.id === modelId ? { ...model, displayName: value } : model,
                ),
              }
            : item,
        ),
      );
    } catch (err) {
      toast(humanMessage(err));
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

  const patchReasoning = async (
    provider: LlmProvider,
    modelId: string,
    enabled: boolean,
    effort: ReasoningEffort,
  ): Promise<void> => {
    try {
      await llmApi.setModelReasoning(modelId, enabled, effort);
      setItems((current) =>
        current.map((item) =>
          item.id === provider.id
            ? {
                ...item,
                models: item.models.map((model) =>
                  model.id === modelId ? { ...model, reasoningEnabled: enabled, reasoningEffort: effort } : model,
                ),
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
          <p className="albedo-ai-muted">No providers yet.</p>
        ) : (
          items.map((item) => {
            const open = openIds.includes(item.id);
            return (
              <article key={item.id} className="albedo-ai-provider-strip">
                <header className="albedo-ai-provider-strip-head">
                  <strong>{item.name}</strong>
                  <span className="albedo-ai-muted">{item.kind === 'oauth' ? 'OAuth' : 'API'}</span>
                  <span className="albedo-ai-strip-actions">
                    <button
                      type="button"
                      className="albedo-icon-btn"
                      aria-label={open ? 'Collapse' : 'Expand'}
                      onClick={() => toggleOpen(item.id)}
                    >
                      <i className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                    </button>
                    <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm albedo-danger-btn"
                      onClick={() => void remove(item.id)}
                    >
                      Delete
                    </button>
                  </span>
                </header>
                <p className="albedo-ai-provider-desc">{item.description || '—'}</p>
                {open ? (
                  <ul className="albedo-ai-provider-models">
                    {item.models.length === 0 ? (
                      <li className="albedo-ai-muted">No models</li>
                    ) : (
                      <>
                        <li className="albedo-ai-model-master">
                          <Switch
                            on={item.models.every((model) => model.enabled)}
                            onChange={(next) => void toggleAllSaved(item, next)}
                          />
                          <span>All</span>
                        </li>
                        {item.models.map((model) => (
                        <li key={model.id}>
                          <Switch on={model.enabled} onChange={(next) => void toggleSaved(item, model.id, next)} />
                          <span className="albedo-ai-model-id">{model.modelId}</span>
                          <input
                            className="form-control form-control-sm albedo-ai-model-alias"
                            defaultValue={model.displayName === model.modelId ? '' : model.displayName}
                            placeholder="custom name"
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                (event.target as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={(event) => {
                              const value = event.target.value.trim() || model.modelId;
                              void renameSaved(item.id, model.id, value);
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm albedo-danger-btn"
                            onClick={() => void removeModel(item.id, model.id)}
                          >
                            Delete
                          </button>
                          {model.supportsReasoning ? (
                            <ReasoningControls
                              enabled={model.reasoningEnabled}
                              effort={model.reasoningEffort ?? 'medium'}
                              onEnabled={(next) =>
                                void patchReasoning(item, model.id, next, model.reasoningEffort ?? 'medium')
                              }
                              onEffort={(next) => void patchReasoning(item, model.id, model.reasoningEnabled, next)}
                            />
                          ) : null}
                        </li>
                        ))}
                      </>
                    )}
                  </ul>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <form
        className="albedo-ai-form albedo-ai-provider-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (kind === 'oauth') {
            void saveOauth();
            return;
          }
          void saveApi();
        }}
      >
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
              OAuth via worker: authorization code + PKCE or device code. Without an app client_id, Connect
              stores the provider as pending.
            </p>
            <div className="albedo-ai-actions">
              <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={saving || !name.trim()}>
                Connect
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
              className={`form-control form-control-sm${urlHint ? ' is-invalid' : ''}`}
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.example.com/v1/"
            />
            {urlHint ? <p className="albedo-field-error">{urlHint}</p> : null}
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
            {probing ? <p className="albedo-ai-muted">Fetching models…</p> : null}
            {showCatalog ? (
              <>
                <div className="albedo-ai-model-search">
                  <i className="bi bi-search" aria-hidden="true" />
                  <input
                    className="form-control form-control-sm"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="search models"
                    aria-label="search models"
                  />
                </div>
                <ul className="albedo-ai-model-pick">
                  {shown.length === 0 && !probing ? (
                    <li className="albedo-ai-muted">No models</li>
                  ) : null}
                  {shown.length > 0 ? (
                    <li className="albedo-ai-model-master">
                      <Switch on={draftAllOn} onChange={toggleAllDraft} />
                      <span>All</span>
                    </li>
                  ) : null}
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
                      <span className="albedo-ai-model-id">{item.id}</span>
                      <input
                        className="form-control form-control-sm albedo-ai-model-alias"
                        value={item.customName}
                        placeholder="custom name"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                          }
                        }}
                        onChange={(event) => {
                          const value = event.target.value;
                          setDraft((current) =>
                            (current ?? []).map((row) =>
                              row.id === item.id ? { ...row, customName: value } : row,
                            ),
                          );
                        }}
                      />
                      {item.supportsReasoning ? (
                        <ReasoningControls
                          enabled={item.reasoningEnabled}
                          effort={item.reasoningEffort}
                          onEnabled={(next) =>
                            setDraft((current) =>
                              (current ?? []).map((row) =>
                                row.id === item.id ? { ...row, reasoningEnabled: next } : row,
                              ),
                            )
                          }
                          onEffort={(next) =>
                            setDraft((current) =>
                              (current ?? []).map((row) =>
                                row.id === item.id ? { ...row, reasoningEffort: next } : row,
                              ),
                            )
                          }
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="albedo-ai-actions">
              {editId ? (
                <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
              <button
                type="submit"
                className="btn btn-sm btn-albedo-primary"
                disabled={
                  saving ||
                  (!editId && (!draft || !draft.some((model) => model.enabled))) ||
                  !name.trim()
                }
              >
                {editId ? 'Update' : 'Save'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function ReasoningControls({
  enabled,
  effort,
  onEnabled,
  onEffort,
}: {
  enabled: boolean;
  effort: ReasoningEffort;
  onEnabled: (next: boolean) => void;
  onEffort: (next: ReasoningEffort) => void;
}): ReactElement {
  return (
    <span className="albedo-ai-reasoning">
      <label className="albedo-ai-reasoning-check">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} />
        reasoning
      </label>
      {enabled ? (
        <select
          className="form-select form-select-sm albedo-ai-reasoning-effort"
          value={effort}
          onChange={(event) => onEffort(event.target.value as ReasoningEffort)}
        >
          {EFFORTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      ) : null}
    </span>
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

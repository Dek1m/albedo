import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { authApi } from '../../api/authApi';
import { llmApi, urlError } from '../../api/llmApi';
import { useAuthStore } from '../../auth/AuthStore';
import type { Group } from '../../domain/group';
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

function fromSaved(saved: LlmProvider['models']): DraftModel[] {
  return saved.map((known) => ({
    id: known.modelId,
    name: known.modelId,
    customName: known.displayName !== known.modelId ? known.displayName : '',
    enabled: known.enabled,
    supportsReasoning: known.supportsReasoning,
    reasoningEnabled: known.reasoningEnabled,
    reasoningEffort: known.reasoningEffort ?? 'medium',
  }));
}

function toDraft(
  probed: { id: string; name: string; supportsReasoning: boolean }[],
): DraftModel[] {
  return probed.map((item) => ({
    id: item.id,
    name: item.name,
    customName: '',
    enabled: false,
    supportsReasoning: item.supportsReasoning,
    reasoningEnabled: false,
    reasoningEffort: 'medium',
  }));
}

function mergeCatalog(
  probed: { id: string; name: string; supportsReasoning: boolean }[],
  saved: LlmProvider['models'],
): DraftModel[] {
  const known = new Map(saved.map((item) => [item.modelId, item]));
  const rows: DraftModel[] = probed.map((item) => {
    const prev = known.get(item.id);
    return {
      id: item.id,
      name: item.name,
      customName: prev && prev.displayName !== prev.modelId ? prev.displayName : '',
      enabled: Boolean(prev),
      supportsReasoning: item.supportsReasoning || Boolean(prev?.supportsReasoning),
      reasoningEnabled: prev?.reasoningEnabled ?? false,
      reasoningEffort: prev?.reasoningEffort ?? 'medium',
    };
  });
  const seen = new Set(probed.map((item) => item.id));
  for (const prev of saved) {
    if (seen.has(prev.modelId)) {
      continue;
    }
    rows.unshift({
      id: prev.modelId,
      name: prev.modelId,
      customName: prev.displayName !== prev.modelId ? prev.displayName : '',
      enabled: true,
      supportsReasoning: prev.supportsReasoning,
      reasoningEnabled: prev.reasoningEnabled,
      reasoningEffort: prev.reasoningEffort ?? 'medium',
    });
  }
  return rows;
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
  const profile = useAuthStore((state) => state.profile);
  const canCommon = Boolean(profile?.isSuperadmin || profile?.isBootstrapAdmin);
  const [items, setItems] = useState<LlmProvider[]>([]);
  const [common, setCommon] = useState(false);
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
  const [oauthVendors, setOauthVendors] = useState<{ id: string; name: string }[]>([
    { id: 'xai', name: 'xAI' },
  ]);
  const [oauthVendor, setOauthVendor] = useState('xai');
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareGroups, setShareGroups] = useState<Group[]>([]);
  const [shareSelected, setShareSelected] = useState<string[]>([]);
  const [oauthFlow, setOauthFlow] = useState<{
    providerId: string;
    userCode: string;
    uri: string;
    complete: string;
    interval: number;
  } | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

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
    void llmApi
      .listOauthVendors()
      .then((rows) => {
        if (rows.length) {
          setOauthVendors(rows);
        }
      })
      .catch(() => undefined);
  }, [visible]);

  useEffect(() => {
    if (!shareId) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setShareId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shareId]);

  useEffect(() => {
    if (oauthFlow) {
      return;
    }
    if (editId && !canProbe) {
      return;
    }
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
          if (editId) {
            const saved = itemsRef.current.find((item) => item.id === editId)?.models ?? [];
            setDraft(mergeCatalog(models, saved));
            return;
          }
          setDraft(toDraft(models));
        })
        .catch((err: unknown) => {
          if (!editId) {
            setDraft(null);
          }
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
  }, [canProbe, baseUrl, apiKey, editId, oauthFlow]);

  useEffect(() => {
    if (!oauthFlow || draft) {
      return;
    }
    let stopped = false;
    const waitMs = Math.max(oauthFlow.interval, 3) * 1000;
    const tick = async (): Promise<void> => {
      try {
        const row = await llmApi.pollOauth(oauthFlow.providerId);
        if (stopped) {
          return;
        }
        if (row.status === 'connected') {
          setProbing(true);
          try {
            const models = await llmApi.probeProviderModels(oauthFlow.providerId);
            if (!stopped) {
              setDraft(toDraft(models));
            }
          } finally {
            if (!stopped) {
              setProbing(false);
            }
          }
          return;
        }
      } catch (err) {
        if (!stopped) {
          toast(humanMessage(err));
          setOauthFlow(null);
        }
        return;
      }
      window.setTimeout(() => {
        if (!stopped) {
          void tick();
        }
      }, waitMs);
    };
    void tick();
    return () => {
      stopped = true;
    };
  }, [oauthFlow, draft]);

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
    setOauthFlow(null);
    setCommon(false);
  };

  const openShare = async (provider: LlmProvider): Promise<void> => {
    setShareId(provider.id);
    try {
      const [groups, current] = await Promise.all([authApi.listGroups(), llmApi.listProviderShares(provider.id)]);
      setShareGroups(groups);
      setShareSelected(current.filter(Boolean));
    } catch (err) {
      toast(humanMessage(err));
      setShareId(null);
    }
  };

  const saveShare = async (providerId: string): Promise<void> => {
    try {
      const current = new Set(await llmApi.listProviderShares(providerId));
      const next = new Set(shareSelected);
      for (const groupId of next) {
        if (!current.has(groupId)) {
          await llmApi.shareProvider(providerId, groupId);
        }
      }
      for (const groupId of current) {
        if (groupId && !next.has(groupId)) {
          await llmApi.unshareProvider(providerId, groupId);
        }
      }
      toast('Sharing updated', 'ok');
      setShareId(null);
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const startEdit = (provider: LlmProvider): void => {
    setEditId(provider.id);
    setCommon(Boolean(provider.common));
    setKind(provider.kind);
    setName(provider.name);
    setDescription(provider.description ?? '');
    setBaseUrl(provider.baseUrl ?? '');
    setApiKey('');
    setDraft(fromSaved(provider.models));
    setSearch('');
    setOpenIds((current) => (current.includes(provider.id) ? current : [...current, provider.id]));
  };

  const saveApi = async (): Promise<void> => {
    if (!name.trim()) {
      toast('Name is required');
      return;
    }
    if (editId) {
      if (!apiKey.trim()) {
        toast('API key is required');
        return;
      }
      setSaving(true);
      try {
        const updated = await llmApi.updateProvider({
          providerId: editId,
          name: name.trim(),
          description: description.trim() || undefined,
          baseUrl: baseUrl.trim() || undefined,
          apiKey: apiKey.trim(),
          models: (draft ?? [])
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
        common,
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
    if (oauthFlow && draft) {
      setSaving(true);
      try {
        const updated = await llmApi.updateProvider({
          providerId: oauthFlow.providerId,
          name: name.trim() || oauthVendors.find((item) => item.id === oauthVendor)?.name || 'xAI',
          description: description.trim() || undefined,
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
        setItems((current) => {
          const rest = current.filter((item) => item.id !== updated.id);
          return [updated, ...rest];
        });
        toast('Provider saved', 'ok');
        resetForm();
      } catch (err) {
        toast(humanMessage(err));
      } finally {
        setSaving(false);
      }
      return;
    }
    const vendor = oauthVendor || 'xai';
    const label = name.trim() || oauthVendors.find((item) => item.id === vendor)?.name || 'xAI';
    setSaving(true);
    try {
      const started = await llmApi.startOauth({
        vendor,
        name: label,
        description: description.trim() || undefined,
        common,
      });
      setName(label);
      setOauthFlow({
        providerId: started.providerId,
        userCode: started.userCode,
        uri: started.verificationUri,
        complete: started.verificationUriComplete,
        interval: started.interval,
      });
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
                  <span className="albedo-ai-muted">
                    {item.shared ? 'Shared' : item.common ? 'Common' : item.kind === 'oauth'
                      ? item.oauthStatus && item.oauthStatus !== 'connected'
                        ? `OAuth · ${item.oauthStatus}`
                        : 'OAuth'
                      : 'API'}
                  </span>
                  <span className="albedo-ai-strip-actions">
                    <button
                      type="button"
                      className="albedo-icon-btn"
                      aria-label={open ? 'Collapse' : 'Expand'}
                      onClick={() => toggleOpen(item.id)}
                    >
                      <i className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                    </button>
                    {item.owned ? (
                      <>
                        {item.common ? (
                          <button
                            type="button"
                            className="btn btn-sm albedo-ghost-btn"
                            onClick={() => void openShare(item)}
                          >
                            Share
                          </button>
                        ) : null}
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
                      </>
                    ) : null}
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
            const next = event.target.value as ProviderKind;
            setKind(next);
            setDraft(null);
            setOauthFlow(null);
            if (next === 'oauth' && !name.trim()) {
              setName(oauthVendors.find((item) => item.id === oauthVendor)?.name ?? 'xAI');
            }
          }}
        >
          <option value="api_key">API</option>
          <option value="oauth">OAuth</option>
        </select>
        {canCommon ? (
          <>
            <label className="form-label" htmlFor="ai-prov-scope">
              Scope
            </label>
            <select
              id="ai-prov-scope"
              className="form-select form-select-sm"
              value={common ? 'common' : 'personal'}
              disabled={Boolean(editId) || Boolean(oauthFlow)}
              onChange={(event) => setCommon(event.target.value === 'common')}
            >
              <option value="personal">Personal</option>
              <option value="common">Organization</option>
            </select>
          </>
        ) : null}

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
            <label className="form-label" htmlFor="ai-oauth-vendor">
              Provider
            </label>
            <select
              id="ai-oauth-vendor"
              className="form-select form-select-sm"
              value={oauthVendor}
              disabled={Boolean(oauthFlow)}
              onChange={(event) => {
                const next = event.target.value;
                const previous = oauthVendors.find((item) => item.id === oauthVendor)?.name ?? '';
                setOauthVendor(next);
                const label = oauthVendors.find((item) => item.id === next)?.name ?? next;
                if (!name.trim() || name.trim() === previous) {
                  setName(label);
                }
              }}
            >
              {oauthVendors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {oauthFlow ? (
              <div className="albedo-ai-oauth-code">
                <p className="albedo-ai-muted">Open the link and enter this code</p>
                <p className="albedo-ai-oauth-user-code">{oauthFlow.userCode}</p>
                <a href={oauthFlow.complete || oauthFlow.uri} target="_blank" rel="noreferrer">
                  {oauthFlow.uri}
                </a>
              </div>
            ) : (
              <p className="albedo-ai-muted">Worker starts device-code sign-in. Approve in the browser, then pick models.</p>
            )}
            {probing ? <p className="albedo-ai-muted">Fetching models…</p> : null}
            {kind === 'oauth' && showCatalog ? (
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
                  {shown.length === 0 && !probing ? <li className="albedo-ai-muted">No models</li> : null}
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
                        onChange={(event) => {
                          const value = event.target.value;
                          setDraft((current) =>
                            (current ?? []).map((row) =>
                              row.id === item.id ? { ...row, customName: value } : row,
                            ),
                          );
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="albedo-ai-actions">
              <button
                type="submit"
                className="btn btn-sm btn-albedo-primary"
                disabled={
                  saving ||
                  probing ||
                  (Boolean(oauthFlow) && !draft) ||
                  Boolean(draft && !draft.some((model) => model.enabled))
                }
              >
                {oauthFlow && draft ? 'Save' : oauthFlow ? 'Waiting…' : 'Connect'}
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
              placeholder={editId ? 're-enter API key' : 'sk-...'}
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
      {shareId ? (
        <div className="albedo-confirm-backdrop" onClick={() => setShareId(null)}>
          <div
            className="albedo-confirm-dialog albedo-ai-share-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-share-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="albedo-confirm-title" id="ai-share-title">
              Share {items.find((item) => item.id === shareId)?.name ?? 'provider'}
            </p>
            <p className="albedo-confirm-text">Choose groups that can use this organization provider.</p>
            <ul className="albedo-ai-share-list">
              {shareGroups.map((group) => (
                <li key={group.id}>
                  <label className="albedo-ai-share-row">
                    <input
                      className="albedo-check"
                      type="checkbox"
                      checked={shareSelected.includes(group.id)}
                      onChange={(event) => {
                        const on = event.target.checked;
                        setShareSelected((current) =>
                          on ? [...current, group.id] : current.filter((id) => id !== group.id),
                        );
                      }}
                    />
                    <span>{group.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="albedo-confirm-actions">
              <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={() => setShareId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-albedo-primary"
                onClick={() => void saveShare(shareId)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
        <input
          className="albedo-check"
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabled(event.target.checked)}
        />
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

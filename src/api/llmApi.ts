import { apiClient } from './client';

export type ProviderKind = 'api_key' | 'oauth';
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

export interface LlmModel {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
  enabled: boolean;
  isAvailable: boolean;
  supportsReasoning: boolean;
  reasoningEnabled: boolean;
  reasoningEffort: ReasoningEffort | null;
}

export interface LlmProvider {
  id: string;
  name: string;
  kind: ProviderKind;
  vendor: string;
  description: string | null;
  baseUrl: string | null;
  defaultModel: string | null;
  apiKeySet: boolean;
  oauthStatus: string | null;
  owned: boolean;
  shared: boolean;
  common: boolean;
  models: LlmModel[];
}

export interface ProbedModel {
  id: string;
  name: string;
  supportsReasoning: boolean;
}

export type AgentKind = 'agent' | 'subagent' | 'cronagent' | 'system' | 'user';

export interface LlmPipeline {
  id: string;
  name: string;
  slug: string;
  purpose: string;
}

export interface LlmStage {
  kind: string;
  name: string;
  args?: string;
  status: string;
}

export interface LlmTrace {
  content: string;
  reasoning: string;
  stages: LlmStage[];
}

export interface LlmRunUsage {
  id: string | null;
  status: string;
  tokensIn: number;
  tokensOut: number;
  cacheTokens: number;
  cacheHits: number;
  content?: string | null;
  error?: string | null;
  trace?: LlmTrace;
}

function asTrace(raw: unknown): LlmTrace {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const stages = Array.isArray(row.stages)
    ? row.stages
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map((item) => ({
          kind: String(item.kind ?? ''),
          name: String(item.name ?? ''),
          args: item.args ? String(item.args) : '',
          status: String(item.status ?? ''),
        }))
    : [];
  return {
    content: String(row.content ?? ''),
    reasoning: String(row.reasoning ?? ''),
    stages,
  };
}

function asRun(row: {
  id?: string | null;
  status?: string;
  tokens_in?: number;
  tokens_out?: number;
  cache_tokens?: number;
  cache_hits?: number;
  content?: string | null;
  error?: string | null;
  trace?: unknown;
}): LlmRunUsage {
  return {
    id: row.id ? String(row.id) : null,
    status: String(row.status ?? 'idle'),
    tokensIn: Number(row.tokens_in ?? 0),
    tokensOut: Number(row.tokens_out ?? 0),
    cacheTokens: Number(row.cache_tokens ?? 0),
    cacheHits: Number(row.cache_hits ?? 0),
    content: row.content ?? null,
    error: row.error ?? null,
    trace: asTrace(row.trace),
  };
}

export interface LlmAgent {
  id: string;
  name: string;
  agentType: AgentKind;
  description: string;
  systemPrompt: string;
  model: string;
  avatarUrl: string | null;
  enabled: boolean;
  visible: boolean;
  isDefault: boolean;
}

interface ModelDto {
  id: string;
  provider_id: string;
  model_id: string;
  display_name: string;
  enabled: boolean;
  is_available: boolean;
  supports_reasoning?: boolean;
  reasoning_enabled?: boolean;
  reasoning_effort?: string | null;
}

interface ProviderDto {
  id: string;
  name: string;
  kind: ProviderKind;
  vendor: string;
  description?: string | null;
  base_url?: string | null;
  default_model?: string | null;
  api_key_set?: boolean;
  oauth_status?: string | null;
  owned?: boolean;
  shared?: boolean;
  common?: boolean;
  models?: ModelDto[];
}

function mapEffort(value: string | null | undefined): ReasoningEffort | null {
  if (value === 'none' || value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return null;
}

function mapModel(item: ModelDto): LlmModel {
  return {
    id: item.id,
    providerId: item.provider_id,
    modelId: item.model_id,
    displayName: item.display_name,
    enabled: Boolean(item.enabled),
    isAvailable: item.is_available !== false,
    supportsReasoning: Boolean(item.supports_reasoning),
    reasoningEnabled: Boolean(item.reasoning_enabled),
    reasoningEffort: mapEffort(item.reasoning_effort),
  };
}

function mapProvider(item: ProviderDto): LlmProvider {
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    vendor: item.vendor,
    description: item.description ?? null,
    baseUrl: item.base_url ?? null,
    defaultModel: item.default_model ?? null,
    apiKeySet: Boolean(item.api_key_set),
    oauthStatus: item.oauth_status ?? null,
    owned: item.owned !== false,
    shared: Boolean(item.shared),
    common: Boolean(item.common),
    models: (item.models ?? []).map(mapModel),
  };
}

export function urlError(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return 'Wrong URL';
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Wrong URL';
    }
    if (!parsed.hostname) {
      return 'Wrong URL';
    }
    return null;
  } catch {
    return 'Wrong URL';
  }
}

export const llmApi = {
  async listProviders(): Promise<LlmProvider[]> {
    const result = await apiClient.call<{ items: ProviderDto[] }>('llm', 'list_providers', {});
    return (result.items ?? []).map(mapProvider);
  },

  async createProvider(input: {
    name: string;
    kind: ProviderKind;
    vendor: string;
    description?: string;
    baseUrl?: string;
    defaultModel?: string;
    apiKey?: string;
    common?: boolean;
    models?: {
      model_id: string;
      display_name: string;
      enabled: boolean;
      supports_reasoning?: boolean;
      reasoning_enabled?: boolean;
      reasoning_effort?: string | null;
    }[];
  }): Promise<LlmProvider> {
    const dto = await apiClient.call<ProviderDto>('llm', 'create_provider', {
      name: input.name,
      kind: input.kind,
      vendor: input.vendor,
      description: input.description ?? null,
      base_url: input.baseUrl ?? null,
      default_model: input.defaultModel ?? null,
      api_key: input.apiKey ?? null,
      models: input.models ?? [],
      common: Boolean(input.common),
    });
    return mapProvider(dto);
  },

  async deleteProvider(providerId: string): Promise<void> {
    await apiClient.call('llm', 'delete_provider', { provider_id: providerId });
  },

  async updateProvider(input: {
    providerId: string;
    name: string;
    description?: string;
    baseUrl?: string;
    apiKey?: string;
    models?: {
      model_id: string;
      display_name: string;
      enabled: boolean;
      supports_reasoning?: boolean;
      reasoning_enabled?: boolean;
      reasoning_effort?: string | null;
    }[];
  }): Promise<LlmProvider> {
    const dto = await apiClient.call<ProviderDto>('llm', 'update_provider', {
      provider_id: input.providerId,
      name: input.name,
      description: input.description ?? null,
      base_url: input.baseUrl ?? null,
      api_key: input.apiKey ?? undefined,
      models: input.models ?? [],
    });
    return mapProvider(dto);
  },

  async deleteModel(modelId: string): Promise<void> {
    await apiClient.call('llm', 'delete_model', { model_id: modelId });
  },

  async probeModels(baseUrl: string, apiKey: string): Promise<ProbedModel[]> {
    const result = await apiClient.call<{
      items: { id: string; name: string; supports_reasoning?: boolean }[];
    }>('llm', 'probe_models', {
      base_url: baseUrl,
      api_key: apiKey,
    });
    const rows = result.items ?? [];
    return rows.map((item) => ({
      id: item.id,
      name: item.name,
      supportsReasoning: Boolean(item.supports_reasoning),
    }));
  },

  async refreshCatalog(): Promise<{ providerName: string; modelId: string; displayName: string }[]> {
    const result = await apiClient.call<{
      vanished: { provider_name?: string; model_id?: string; display_name?: string }[];
    }>('llm', 'refresh_catalog', {});
    return (result.vanished ?? []).map((item) => ({
      providerName: item.provider_name ?? '',
      modelId: item.model_id ?? '',
      displayName: item.display_name ?? item.model_id ?? '',
    }));
  },

  async setModelEnabled(modelId: string, enabled: boolean): Promise<void> {
    await apiClient.call('llm', 'set_model_enabled', { model_id: modelId, enabled });
  },

  async setModelName(modelId: string, displayName: string): Promise<void> {
    await apiClient.call('llm', 'set_model_name', { model_id: modelId, display_name: displayName });
  },

  async setProviderModelsEnabled(providerId: string, enabled: boolean): Promise<void> {
    await apiClient.call('llm', 'set_provider_models_enabled', { provider_id: providerId, enabled });
  },

  async setModelReasoning(modelId: string, enabled: boolean, effort: ReasoningEffort): Promise<void> {
    await apiClient.call('llm', 'set_model_reasoning', {
      model_id: modelId,
      reasoning_enabled: enabled,
      reasoning_effort: effort,
    });
  },

  async listOauthVendors(): Promise<{ id: string; name: string; mode: string }[]> {
    const result = await apiClient.call<{ items: { id: string; name: string; mode?: string }[] }>(
      'llm',
      'list_oauth_vendors',
      {},
    );
    return (result.items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      mode: item.mode ?? 'device_code',
    }));
  },

  async startOauth(input: {
    vendor: string;
    name?: string;
    description?: string;
    common?: boolean;
  }): Promise<{
    providerId: string;
    vendor: string;
    status: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete: string;
    interval: number;
    expiresIn: number;
  }> {
    const row = await apiClient.call<{
      provider_id: string;
      vendor: string;
      status: string;
      user_code: string;
      verification_uri: string;
      verification_uri_complete: string;
      interval: number;
      expires_in: number;
    }>('llm', 'start_oauth', {
      vendor: input.vendor,
      name: input.name ?? null,
      description: input.description ?? null,
      common: Boolean(input.common),
    });
    return {
      providerId: row.provider_id,
      vendor: row.vendor,
      status: row.status,
      userCode: row.user_code,
      verificationUri: row.verification_uri,
      verificationUriComplete: row.verification_uri_complete,
      interval: row.interval,
      expiresIn: row.expires_in,
    };
  },

  async pollOauth(providerId: string): Promise<{ status: string; interval?: number }> {
    return apiClient.call('llm', 'poll_oauth', { provider_id: providerId });
  },

  async shareProvider(providerId: string, groupId: string): Promise<void> {
    await apiClient.call('llm', 'share_provider', { provider_id: providerId, group_id: groupId });
  },

  async unshareProvider(providerId: string, groupId: string): Promise<void> {
    await apiClient.call('llm', 'unshare_provider', { provider_id: providerId, group_id: groupId });
  },

  async listProviderShares(providerId: string): Promise<string[]> {
    const result = await apiClient.call<{ items: { group_id?: string }[] }>('llm', 'list_provider_shares', {
      provider_id: providerId,
    });
    return (result.items ?? []).map((item) => String(item.group_id ?? ''));
  },

  async listAgents(): Promise<LlmAgent[]> {
    const result = await apiClient.call<{
      items?: {
        id?: string;
        name?: string;
        agent_type?: string;
        description?: string | null;
        system_prompt?: string | null;
        model?: string | null;
        avatar_url?: string | null;
        is_active?: boolean;
        is_visible?: boolean;
        is_default?: boolean;
      }[];
    }>('llm', 'agents', {});
    return (result.items ?? []).map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      agentType: (row.agent_type as AgentKind) || 'agent',
      description: String(row.description ?? ''),
      systemPrompt: String(row.system_prompt ?? ''),
      model: String(row.model ?? ''),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      enabled: row.is_active !== false,
      visible: row.is_visible !== false,
      isDefault: Boolean(row.is_default),
    }));
  },

  async createAgent(input: {
    name: string;
    agentType: AgentKind;
    systemPrompt: string;
    model: string;
  }): Promise<LlmAgent> {
    const row = await apiClient.call<{
      id?: string;
      name?: string;
      agent_type?: string;
      description?: string | null;
      system_prompt?: string | null;
      model?: string | null;
      avatar_url?: string | null;
    }>('llm', 'create_agent', {
      name: input.name,
      agent_type: input.agentType,
      system_prompt: input.systemPrompt,
      model: input.model || null,
    });
    return {
      id: String(row.id ?? ''),
      name: String(row.name ?? input.name),
      agentType: (row.agent_type as AgentKind) || input.agentType,
      description: String(row.description ?? ''),
      systemPrompt: String(row.system_prompt ?? input.systemPrompt),
      model: String(row.model ?? input.model),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      enabled: true,
      visible: true,
      isDefault: false,
    };
  },

  async setAgentAvatar(agentId: string, imageB64: string, contentType: string): Promise<string> {
    const row = await apiClient.call<{ avatar_url?: string }>('llm', 'set_agent_avatar', {
      agent_id: agentId,
      image_b64: imageB64,
      content_type: contentType,
    });
    return String(row.avatar_url ?? '');
  },

  async updateAgent(input: {
    agentId: string;
    name: string;
    agentType: AgentKind;
    systemPrompt: string;
    model: string;
  }): Promise<void> {
    await apiClient.call('llm', 'update_agent', {
      agent_id: input.agentId,
      name: input.name,
      agent_type: input.agentType,
      system_prompt: input.systemPrompt,
      model: input.model || null,
    });
  },

  async setAgentEnabled(agentId: string, enabled: boolean): Promise<void> {
    await apiClient.call('llm', 'update_agent', { agent_id: agentId, is_active: enabled });
  },

  async setAgentVisible(agentId: string, visible: boolean): Promise<void> {
    await apiClient.call('llm', 'update_agent', { agent_id: agentId, is_visible: visible });
  },

  async setAgentDefault(agentId: string): Promise<void> {
    await apiClient.call('llm', 'update_agent', { agent_id: agentId, is_default: true });
  },

  async deleteAgent(agentId: string): Promise<void> {
    await apiClient.call('llm', 'delete_agent', { agent_id: agentId });
  },

  async listPipelines(): Promise<LlmPipeline[]> {
    const result = await apiClient.call<{
      items?: { id?: string; name?: string; slug?: string; purpose?: string | null }[];
    }>('llm', 'list_pipelines', {});
    return (result.items ?? []).map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      slug: String(row.slug ?? ''),
      purpose: String(row.purpose ?? ''),
    }));
  },

  async runPipeline(input: {
    workspaceId: string;
    sessionId: string;
    pipelineId?: string;
    agentId?: string;
    signal?: AbortSignal;
  }): Promise<LlmRunUsage> {
    const row = await apiClient.call<{
      id?: string | null;
      status?: string;
      tokens_in?: number;
      tokens_out?: number;
      cache_tokens?: number;
      cache_hits?: number;
      content?: string | null;
      error?: string | null;
      trace?: unknown;
    }>('llm', 'run_pipeline', {
      workspace_id: input.workspaceId,
      session_id: input.sessionId,
      pipeline_id: input.pipelineId,
      agent_id: input.agentId,
    }, { signal: input.signal });
    return asRun(row);
  },

  async cancelRun(sessionId: string): Promise<LlmRunUsage> {
    const row = await apiClient.call<{
      id?: string | null;
      status?: string;
      tokens_in?: number;
      tokens_out?: number;
      cache_tokens?: number;
      cache_hits?: number;
      error?: string | null;
      trace?: unknown;
    }>('llm', 'cancel_run', { session_id: sessionId });
    return asRun({ ...row, status: row.status ?? 'cancelled' });
  },

  async runUsage(sessionId: string): Promise<LlmRunUsage> {
    const row = await apiClient.call<{
      id?: string | null;
      status?: string;
      tokens_in?: number;
      tokens_out?: number;
      cache_tokens?: number;
      cache_hits?: number;
      error?: string | null;
      trace?: unknown;
    }>('llm', 'run_usage', { session_id: sessionId });
    return asRun(row);
  },

  async probeProviderModels(providerId: string): Promise<ProbedModel[]> {
    const result = await apiClient.call<{
      items: { id: string; name: string; supports_reasoning?: boolean }[];
    }>('llm', 'probe_provider_models', { provider_id: providerId });
    return (result.items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      supportsReasoning: Boolean(item.supports_reasoning),
    }));
  },
};

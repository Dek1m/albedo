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
  models: LlmModel[];
}

export interface ProbedModel {
  id: string;
  name: string;
  supportsReasoning: boolean;
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
      api_key: input.apiKey ?? null,
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

  async startOauth(vendor: string): Promise<{ status: string; vendor: string; mode?: string }> {
    return apiClient.call('llm', 'start_oauth', { vendor });
  },
};

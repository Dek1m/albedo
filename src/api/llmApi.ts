import { apiClient } from './client';

export type ProviderKind = 'api_key' | 'oauth';

export interface LlmProvider {
  id: string;
  name: string;
  kind: ProviderKind;
  vendor: string;
  baseUrl: string | null;
  defaultModel: string | null;
  apiKeySet: boolean;
  oauthStatus: string | null;
}

interface ProviderDto {
  id: string;
  name: string;
  kind: ProviderKind;
  vendor: string;
  base_url?: string | null;
  default_model?: string | null;
  api_key_set?: boolean;
  oauth_status?: string | null;
}

function mapProvider(item: ProviderDto): LlmProvider {
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    vendor: item.vendor,
    baseUrl: item.base_url ?? null,
    defaultModel: item.default_model ?? null,
    apiKeySet: Boolean(item.api_key_set),
    oauthStatus: item.oauth_status ?? null,
  };
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
    baseUrl?: string;
    defaultModel?: string;
    apiKey?: string;
  }): Promise<LlmProvider> {
    const dto = await apiClient.call<ProviderDto>('llm', 'create_provider', {
      name: input.name,
      kind: input.kind,
      vendor: input.vendor,
      base_url: input.baseUrl ?? null,
      default_model: input.defaultModel ?? null,
      api_key: input.apiKey ?? null,
    });
    return mapProvider(dto);
  },

  async startOauth(vendor: string): Promise<{ status: string; vendor: string }> {
    return apiClient.call('llm', 'start_oauth', { vendor });
  },
};

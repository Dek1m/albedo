import type { LlmPipeline } from '../../api/llmApi';

export const LAST_PIPELINE_KEY = 'albedo.dock.lastPipelineId';

export function readLastPipelineId(): string | null {
  try {
    return localStorage.getItem(LAST_PIPELINE_KEY);
  } catch {
    return null;
  }
}

export function writeLastPipelineId(id: string): void {
  try {
    localStorage.setItem(LAST_PIPELINE_KEY, id);
  } catch {
    /* quota */
  }
}

export function pickPipelineId(items: LlmPipeline[], lastId: string | null): string {
  if (lastId && items.some((item) => item.id === lastId)) {
    return lastId;
  }
  const named = items.find((item) => item.slug === 'main-algorithm' || item.name === 'Main Algorithm');
  return named?.id ?? items[0]?.id ?? '';
}

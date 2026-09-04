import type { LlmAgent } from '../../api/llmApi';

export const LAST_AGENT_KEY = 'albedo.dock.lastAgentId';

export function readLastAgentId(): string | null {
  try {
    return localStorage.getItem(LAST_AGENT_KEY);
  } catch {
    return null;
  }
}

export function writeLastAgentId(id: string): void {
  try {
    localStorage.setItem(LAST_AGENT_KEY, id);
  } catch {
    /* quota / private mode */
  }
}

export function pickAgentId(agents: LlmAgent[], lastId: string | null): string {
  const visible = agents.filter((item) => item.enabled && item.visible);
  if (lastId && visible.some((item) => item.id === lastId)) {
    return lastId;
  }
  return visible.find((item) => item.isDefault)?.id ?? visible[0]?.id ?? '';
}

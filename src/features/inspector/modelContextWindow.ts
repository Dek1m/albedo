/**
 * Локальная таблица окон контекста известных моделей — эвристика до появления
 * contextLength в каталоге бэка. Матчинг по подстроке modelId/displayName,
 * записи идут от специфичных к общим (первое совпадение выигрывает).
 */
const WINDOWS: readonly [string, number][] = [
  ['gpt-5', 400_000],
  ['gpt-4.1', 1_000_000],
  ['gpt-4o-mini', 128_000],
  ['gpt-4o', 128_000],
  ['gpt-4-turbo', 128_000],
  ['gpt-4', 8_192],
  ['o4-mini', 200_000],
  ['o3-mini', 200_000],
  ['o3', 200_000],
  ['claude-opus-4', 200_000],
  ['claude-sonnet-4', 1_000_000],
  ['claude-haiku', 200_000],
  ['claude-3-7', 200_000],
  ['claude-3-5', 200_000],
  ['claude-3', 200_000],
  ['claude', 200_000],
  ['gemini-2', 1_000_000],
  ['gemini-1.5', 1_000_000],
  ['deepseek-r1', 128_000],
  ['deepseek-chat', 64_000],
  ['deepseek', 128_000],
  ['glm-4', 128_000],
  ['qwen', 131_072],
  ['llama-3', 128_000],
  ['mistral', 128_000],
];

export function matchContextWindow(model: string): number | null {
  const needle = model.trim().toLowerCase();
  if (!needle) {
    return null;
  }
  for (const [prefix, window] of WINDOWS) {
    if (needle.includes(prefix)) {
      return window;
    }
  }
  return null;
}

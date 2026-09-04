/** Локальная оценка токенов черновика. Не эмбеддер и не словарь модели. */

export function estimatePromptTokens(text: string): number {
  if (!text) {
    return 0;
  }
  let tokens = 0;
  const parts = text.match(/\S+|\s+/g) ?? [];
  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      tokens += 1;
      continue;
    }
    let cyr = 0;
    let cjk = 0;
    for (const ch of part) {
      const code = ch.codePointAt(0) ?? 0;
      if (code >= 0x400 && code <= 0x4ff) {
        cyr += 1;
      } else if (code >= 0x3000 && code <= 0x9fff) {
        cjk += 1;
      }
    }
    const other = part.length - cyr - cjk;
    tokens += cjk + Math.ceil(cyr / 2) + Math.max(1, Math.ceil(other / 4));
  }
  return tokens;
}

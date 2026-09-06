import type { ChatMessage } from '../../domain/workspace';

/**
 * Реконструкция текста, ушедшего в LLM с последним запросом: system prompt агента
 * + сообщения видимой ветки до последнего user-сообщения включительно.
 * Бэк пока не отдаёт тела промптов (ADR-007: контент opt-in) — это клиентская
 * аппроксимация, источник подменится на фактический, когда появится RPC.
 */
export function buildLastPrompt(messages: readonly ChatMessage[], systemPrompt: string | null): string {
  // Хвост после последнего user-сообщения — ответы, которых в промпте ещё не было.
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') {
      lastUser = i;
      break;
    }
  }
  if (lastUser < 0) {
    return '';
  }
  const blocks: string[] = [];
  if (systemPrompt && systemPrompt.trim()) {
    blocks.push(`[system]\n${systemPrompt.trim()}`);
  }
  for (const msg of messages.slice(0, lastUser + 1)) {
    const text = (msg.content ?? '').trim();
    if (!text) {
      continue;
    }
    blocks.push(`[${msg.role}]\n${text}`);
  }
  return blocks.join('\n\n');
}

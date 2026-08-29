import { llmApi } from '../../api/llmApi';
import { toast } from '../../shared/toast/toastStore';

export async function syncLlmCatalogOnAuth(): Promise<void> {
  try {
    const vanished = await llmApi.refreshCatalog();
    for (const item of vanished) {
      toast(`Модель пропала: ${item.providerName} / ${item.displayName}`);
    }
  } catch {
    /* нет llm:config или сеть — не блокируем вход */
  }
}

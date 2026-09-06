import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { llmApi } from '../../api/llmApi';
import type { LlmAgent, LlmProvider } from '../../api/llmApi';
import { workspaceApi } from '../../api/workspaceApi';
import type { ChatMessage } from '../../domain/workspace';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { visiblePath, withParents } from '../workspace/chatBranches';
import { useLoopMetrics } from '../dock/loopMetrics';
import { buildLastPrompt } from './lastPrompt';
import { matchContextWindow } from './modelContextWindow';

const EMPTY_MESSAGES: ChatMessage[] = [];

function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

export function ContextPanel(): ReactElement {
  const active = useWorkspaceStore((s) => s.active);
  const focused = useWorkspaceStore((s) => s.focusedSessionId);
  const branchPick = useWorkspaceStore((s) => s.branchPick);
  const chatRev = useWorkspaceStore((s) => s.chatRev);
  const status = useLoopMetrics((s) => s.status);
  const tokensIn = useLoopMetrics((s) => s.tokensIn);
  const tokensOut = useLoopMetrics((s) => s.tokensOut);
  const cacheTokens = useLoopMetrics((s) => s.cacheTokens);
  const cacheHits = useLoopMetrics((s) => s.cacheHits);
  const loopSessionId = useLoopMetrics((s) => s.sessionId);
  const liveAgent = useLoopMetrics((s) => s.agentName);
  const liveModel = useLoopMetrics((s) => s.modelName);
  const setMetrics = useLoopMetrics((s) => s.setMetrics);
  const [agents, setAgents] = useState<LlmAgent[]>([]);
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  // Данные принадлежат сессии загрузки: при переключении вкладки чата лента не «мигает» чужим.
  const [loaded, setLoaded] = useState<{ session: string | null; items: ChatMessage[] }>({
    session: null,
    items: [],
  });

  // Поллинг usage — перенесён из бывшей вкладки Context нижнего дока.
  useEffect(() => {
    // Стор глобальный: чужой run_usage подменит live-трассу идущего цикла.
    if (!focused || (loopSessionId !== null && loopSessionId !== focused)) {
      return;
    }
    let cancelled = false;
    const pull = (): void => {
      void llmApi
        .runUsage(focused)
        .then((row) => {
          if (cancelled) {
            return;
          }
          // Статусом управляет MessageTab; полл обновляет трассу и копилку токенов чата.
          const next: Parameters<typeof setMetrics>[0] = {
            trace: row.trace,
            tokensIn: row.tokensIn,
            tokensOut: row.tokensOut,
          };
          if (status === 'idle' && row.status && row.status !== 'idle') {
            next.status = row.status;
          }
          setMetrics(next);
        })
        .catch(() => {
          /* idle */
        });
    };
    pull();
    const timer = window.setInterval(pull, status === 'running' ? 400 : 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [focused, chatRev, status, setMetrics, loopSessionId]);

  // System prompt нужен для реконструкции промпта — каталог агентов статичен, грузим один раз.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([llmApi.listAgents(), llmApi.listProviders()])
      .then(([items, catalog]) => {
        if (!cancelled) {
          setAgents(items);
          setProviders(catalog);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAgents([]);
          setProviders([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Ветка чата — тот же источник, что и лента ChatPane.
  useEffect(() => {
    const workspaceId = active?.id;
    if (!workspaceId || !focused) {
      return;
    }
    let cancelled = false;
    workspaceApi
      .listMessages(workspaceId, focused)
      .then((items) => {
        if (!cancelled) {
          setLoaded({ session: focused, items });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({ session: focused, items: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active, focused, chatRev]);

  const messages = useMemo(
    () => (loaded.session === focused ? loaded.items : EMPTY_MESSAGES),
    [loaded, focused],
  );

  const visible = useMemo(() => visiblePath(withParents(messages), branchPick), [messages, branchPick]);
  const lastAssistant = useMemo(() => {
    for (let i = visible.length - 1; i >= 0; i -= 1) {
      if (visible[i]?.role === 'assistant') {
        return visible[i] ?? null;
      }
    }
    return null;
  }, [visible]);
  const running = status === 'running' && loopSessionId !== null && loopSessionId === focused;
  // При живом стриме имя из стора цикла, иначе — последний ответивший в ветке.
  const agentName = running && liveAgent ? liveAgent : (lastAssistant?.agentName ?? '');
  const modelName = running && liveModel ? liveModel : (lastAssistant?.modelName ?? '');
  const systemPrompt = useMemo(() => {
    const agent = agents.find((item) => item.name === agentName);
    return agent?.systemPrompt || null;
  }, [agents, agentName]);
  const promptText = useMemo(
    () => buildLastPrompt(visible, systemPrompt),
    [visible, systemPrompt],
  );

  const cacheRate = tokensIn > 0 ? `${Math.round((cacheTokens / tokensIn) * 100)}%` : '—';
  // Окно модели: сначала фактическое из каталога (провайдер отдал), затем локальная эвристика.
  const catalogWindow = useMemo(() => {
    if (!modelName) {
      return null;
    }
    const needle = modelName.toLowerCase();
    for (const provider of providers) {
      for (const item of provider.models) {
        if (
          item.displayName.toLowerCase() === needle ||
          item.modelId.toLowerCase() === needle
        ) {
          return item.contextLength;
        }
      }
    }
    return null;
  }, [providers, modelName]);
  const contextWindow = catalogWindow ?? (modelName ? matchContextWindow(modelName) : null);
  const windowLabel = contextWindow ? formatCount(contextWindow) : '—';
  const usedPct =
    contextWindow && contextWindow > 0 ? Math.min(100, Math.round((tokensIn / contextWindow) * 100)) : null;

  const rows = [
    { label: 'Status', value: status },
    { label: 'Tokens in', value: formatCount(tokensIn) },
    { label: 'Tokens out', value: formatCount(tokensOut) },
    { label: 'Cache tokens', value: formatCount(cacheTokens) },
    { label: 'Cache hits', value: formatCount(cacheHits) },
    { label: 'Cache rate', value: cacheRate },
    { label: 'Context used', value: formatCount(tokensIn) },
    { label: 'Model context', value: windowLabel },
  ];

  return (
    <div className="albedo-inspect-context">
      <p className="albedo-inspect-hint">
        {agentName ? `${agentName}` : 'Current run'}
        {modelName ? ` · ${modelName}` : ''}
      </p>
      <dl className="albedo-inspect-metrics">
        {rows.map((row) => (
          <div key={row.label} className="albedo-inspect-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {usedPct !== null ? (
        <div className="albedo-inspect-bar" title={`${formatCount(tokensIn)} / ${windowLabel} tokens`}>
          <div className="albedo-inspect-bar-fill" style={{ width: `${usedPct}%` }} />
        </div>
      ) : null}
      <p className="albedo-inspect-hint">Last prompt</p>
      {promptText ? (
        <pre className="albedo-inspect-prompt">{promptText}</pre>
      ) : (
        <p className="albedo-inspect-empty">No prompt yet</p>
      )}
      <p className="albedo-inspect-note">
        Reconstructed on client: system prompt + visible branch. Provider prompt API pending.
      </p>
    </div>
  );
}

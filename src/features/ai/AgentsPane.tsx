import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { llmApi } from '../../api/llmApi';
import type { LlmAgent, LlmProvider } from '../../api/llmApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { AgentForm } from './AgentForm';
import type { AgentFormMode } from './AgentForm';

interface AgentsPaneProps {
  visible: boolean;
}

function kindIcon(kind: LlmAgent['agentType']): string {
  if (kind === 'cronagent') {
    return 'bi-clock';
  }
  if (kind === 'subagent') {
    return 'bi-diagram-3';
  }
  if (kind === 'system') {
    return 'bi-gear-wide-connected';
  }
  return 'bi-robot';
}

function kindLabel(kind: LlmAgent['agentType']): string {
  if (kind === 'cronagent') {
    return 'cronagent';
  }
  if (kind === 'subagent') {
    return 'subagent';
  }
  if (kind === 'system') {
    return 'system';
  }
  return 'agent';
}

export function AgentsPane({ visible }: AgentsPaneProps): ReactElement {
  const [items, setItems] = useState<LlmAgent[]>([]);
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AgentFormMode | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LlmAgent | null>(null);

  const load = async (): Promise<void> => {
    try {
      const [agents, catalog] = await Promise.all([llmApi.listAgents(), llmApi.listProviders()]);
      setItems(agents);
      setProviders(catalog);
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all([llmApi.listAgents(), llmApi.listProviders()])
      .then(([agents, catalog]) => {
        if (!cancelled) {
          setItems(agents);
          setProviders(catalog);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast(humanMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const remove = async (): Promise<void> => {
    if (!pendingDelete) {
      return;
    }
    try {
      await llmApi.deleteAgent(pendingDelete.id);
      toast('Saved', 'ok');
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  if (loading && !items.length) {
    return <SkeletonList rows={6} />;
  }

  return (
    <div className="albedo-agents">
      <div className="albedo-admin-role-toolbar">
        <button type="button" className="btn btn-sm btn-albedo-primary" onClick={() => setForm({ kind: 'create' })}>
          New agent
        </button>
      </div>
      <ul className="list-group albedo-ws-list">
        {items.map((agent) => {
          const locked = agent.agentType === 'system';
          return (
            <li key={agent.id} className="list-group-item albedo-session-row">
              <i className={`bi ${kindIcon(agent.agentType)}`} />
              <button
                type="button"
                className="albedo-ws-list-name"
                disabled={locked}
                onClick={() => {
                  if (!locked) {
                    setForm({ kind: 'edit', agent });
                  }
                }}
              >
                {agent.name}
              </button>
              <span className="albedo-badge">{kindLabel(agent.agentType)}</span>
              {locked ? null : (
                <button type="button" className="btn btn-sm albedo-danger-btn" onClick={() => setPendingDelete(agent)}>
                  Delete
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!items.length ? <p className="albedo-ai-muted">No agents</p> : null}
      <AgentForm mode={form} providers={providers} onClose={() => setForm(null)} onSaved={() => void load()} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete agent"
        body={`Delete agent ${pendingDelete?.name ?? ''}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

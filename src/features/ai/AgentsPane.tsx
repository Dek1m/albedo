import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { llmApi } from '../../api/llmApi';
import type { LlmAgent, LlmProvider } from '../../api/llmApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Avatar } from '../../shared/ui/Avatar';
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
      <ul className="list-group albedo-ws-list">
        {items.map((agent) => {
          const locked = agent.agentType === 'system';
          return (
            <li key={agent.id} className="list-group-item albedo-session-row">
              <input
                type="checkbox"
                className="albedo-check"
                checked={agent.enabled}
                aria-label={`${agent.name} enabled`}
                onChange={() => {
                  void (async () => {
                    try {
                      await llmApi.setAgentEnabled(agent.id, !agent.enabled);
                      setItems((prev) =>
                        prev.map((item) =>
                          item.id === agent.id ? { ...item, enabled: !agent.enabled } : item,
                        ),
                      );
                    } catch (err) {
                      toast(humanMessage(err));
                    }
                  })();
                }}
              />
              <Avatar label={agent.name} src={agent.avatarUrl} size={28} />
              <i className={`bi ${kindIcon(agent.agentType)}`} />
              <button
                type="button"
                className="albedo-ws-list-name"
                onClick={() => {
                  if (!locked) {
                    setForm({ kind: 'edit', agent });
                  }
                }}
              >
                {agent.name}
              </button>
              <span className="albedo-badge">{kindLabel(agent.agentType)}</span>
              <span className="albedo-ai-strip-actions">
                <button
                  type="button"
                  className={`albedo-icon-btn${agent.isDefault ? ' is-on' : ''}`}
                  title="Default agent"
                  aria-label="Default agent"
                  onClick={() => {
                    void (async () => {
                      try {
                        await llmApi.setAgentDefault(agent.id);
                        setItems((prev) =>
                          prev.map((item) => ({ ...item, isDefault: item.id === agent.id })),
                        );
                      } catch (err) {
                        toast(humanMessage(err));
                      }
                    })();
                  }}
                >
                  <i className={`bi ${agent.isDefault ? 'bi-star-fill' : 'bi-star'}`} />
                </button>
                <button
                  type="button"
                  className="albedo-icon-btn"
                  title={agent.visible ? 'Hide from Message' : 'Show in Message'}
                  aria-label="Visibility"
                  onClick={() => {
                    void (async () => {
                      try {
                        await llmApi.setAgentVisible(agent.id, !agent.visible);
                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === agent.id ? { ...item, visible: !agent.visible } : item,
                          ),
                        );
                      } catch (err) {
                        toast(humanMessage(err));
                      }
                    })();
                  }}
                >
                  <i className={`bi ${agent.visible ? 'bi-eye' : 'bi-eye-slash'}`} />
                </button>
                <button
                  type="button"
                  className="btn btn-sm albedo-ghost-btn"
                  disabled={locked}
                  onClick={() => setForm({ kind: 'edit', agent })}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-sm albedo-danger-btn"
                  disabled={locked}
                  onClick={() => setPendingDelete(agent)}
                >
                  Delete
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {!items.length ? <p className="albedo-ai-muted">No agents</p> : null}
      <div className="albedo-list-create">
        <button type="button" className="btn btn-sm btn-albedo-primary" onClick={() => setForm({ kind: 'create' })}>
          New agent
        </button>
      </div>
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

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import { llmApi } from '../../api/llmApi';
import type { LlmAgent, LlmPipeline, LlmProvider } from '../../api/llmApi';
import { humanMessage } from '../../api/errors';
import { workspaceApi } from '../../api/workspaceApi';
import { MarkdownPrompt } from '../ai/MarkdownPrompt';
import { toast } from '../../shared/toast/toastStore';
import { FileGlyph } from '../../shared/ui/FileGlyph';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { estimatePromptTokens } from './estimatePromptTokens';
import { pickAgentId, readLastAgentId, writeLastAgentId } from './lastAgent';
import { pickPipelineId, readLastPipelineId, writeLastPipelineId } from './lastPipeline';
import { useLoopMetrics } from './loopMetrics';

interface LocalAttach {
  name: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageTab(): ReactElement {
  const focused = useWorkspaceStore((s) => s.focusedSessionId);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const sessions = useWorkspaceStore((s) => s.sessions);
  const bumpChatRev = useWorkspaceStore((s) => s.bumpChatRev);
  const composerDraft = useWorkspaceStore((s) => s.composerDraft);
  const setComposerDraft = useWorkspaceStore((s) => s.setComposerDraft);
  const composerParentId = useWorkspaceStore((s) => s.composerParentId);
  const setComposerParentId = useWorkspaceStore((s) => s.setComposerParentId);
  const threadTailId = useWorkspaceStore((s) => s.threadTailId);
  const setBranchPick = useWorkspaceStore((s) => s.setBranchPick);
  const session = tabs.find((item) => item.id === focused) ?? sessions.find((item) => item.id === focused);
  const [draft, setDraft] = useState('');
  const [agentId, setAgentId] = useState('');
  const [pipelineId, setPipelineId] = useState('');
  const [agents, setAgents] = useState<LlmAgent[]>([]);
  const [pipelines, setPipelines] = useState<LlmPipeline[]>([]);
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const setMetrics = useLoopMetrics((s) => s.setMetrics);
  const loopStatus = useLoopMetrics((s) => s.status);
  const [attach, setAttach] = useState<LocalAttach | null>(null);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const picker = agents.filter((agent) => agent.enabled && agent.visible);
  const canSend = Boolean(session) && Boolean(draft.trim()) && !running;

  useEffect(() => {
    let cancelled = false;
    void Promise.all([llmApi.listAgents(), llmApi.listProviders(), llmApi.listPipelines()])
      .then(([items, catalog, pipes]) => {
        if (cancelled) {
          return;
        }
        setAgents(items);
        setProviders(catalog);
        setPipelines(pipes);
        setAgentId((current) => pickAgentId(items, current || readLastAgentId()));
        setPipelineId((current) => pickPipelineId(pipes, current || readLastPipelineId()));
      })
      .catch(() => {
        if (!cancelled) {
          setAgents([]);
          setProviders([]);
          setPipelines([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (composerDraft == null) {
      return;
    }
    setDraft(composerDraft);
    setComposerDraft(null);
  }, [composerDraft, setComposerDraft]);

  const clearComposer = (): void => {
    setDraft('');
    setAttach(null);
  };

  const send = async (): Promise<void> => {
    const text = draft.trim();
    if (running) {
      return;
    }
    if (!session) {
      toast('Open a session');
      return;
    }
    if (!text) {
      return;
    }
    const agent = picker.find((item) => item.id === agentId);
    let modelName = '';
    if (agent?.model) {
      for (const provider of providers) {
        const model = provider.models.find((item) => item.id === agent.model);
        if (model) {
          modelName = model.displayName;
          break;
        }
      }
    }
    try {
      const parentId = composerParentId ?? threadTailId;
      const posted = await workspaceApi.postMessage(session.workspaceId, session.id, 'user', text, {
        agentName: agent?.name,
        modelName: modelName || undefined,
        parentId: parentId || undefined,
      });
      setBranchPick(parentId ?? '', posted.id);
      setComposerParentId(null);
      clearComposer();
      bumpChatRev();
      if (pipelineId) {
        const ac = new AbortController();
        abortRef.current = ac;
        setRunning(true);
        setMetrics({ status: 'running', agentName: agent?.name || '', trace: { content: '', reasoning: '', stages: [] } });
        const tick = window.setInterval(() => {
          void llmApi
            .runUsage(session.id)
            .then((row) => {
              setMetrics({
                status: row.status === 'idle' ? 'running' : row.status,
                tokensIn: row.tokensIn,
                tokensOut: row.tokensOut,
                cacheTokens: row.cacheTokens,
                cacheHits: row.cacheHits,
                trace: row.trace,
              });
            })
            .catch(() => undefined);
        }, 250);
        try {
          const usage = await llmApi.runPipeline({
            workspaceId: session.workspaceId,
            sessionId: session.id,
            pipelineId,
            agentId: agentId || undefined,
            signal: ac.signal,
          });
          setMetrics({
            status: usage.status,
            tokensIn: usage.tokensIn,
            tokensOut: usage.tokensOut,
            cacheTokens: usage.cacheTokens,
            cacheHits: usage.cacheHits,
            trace: usage.trace,
            agentName: agent?.name || '',
          });
          bumpChatRev();
          if (usage.status === 'error' && usage.error) {
            toast(usage.error);
          }
        } finally {
          window.clearInterval(tick);
          abortRef.current = null;
          setRunning(false);
        }
      }
    } catch (err) {
      abortRef.current = null;
      setRunning(false);
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'ABORTED') {
        setMetrics({ status: 'cancelled' });
        return;
      }
      toast(humanMessage(err));
    }
  };

  const stop = async (): Promise<void> => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
    setMetrics({ status: 'cancelled' });
    if (session) {
      try {
        const usage = await llmApi.cancelRun(session.id);
        setMetrics({
          status: usage.status || 'cancelled',
          tokensIn: usage.tokensIn,
          tokensOut: usage.tokensOut,
          cacheTokens: usage.cacheTokens,
          cacheHits: usage.cacheHits,
        });
      } catch {
        /* client already stopped */
      }
    }
  };

  const onAttach = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    setAttach({ name: file.name, size: file.size });
  };

  const onPromptKey = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    const enter = event.key === 'Enter' || event.code === 'Enter' || event.code === 'NumpadEnter';
    if (!enter || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    void send();
  };

  return (
    <div className="albedo-message-tab">
      <div className="albedo-message-tools">
        <select
          className="form-select form-select-sm albedo-message-agent"
          aria-label="Agent"
          value={agentId}
          disabled={picker.length === 0}
          onChange={(event) => {
            const id = event.target.value;
            setAgentId(id);
            if (id) {
              writeLastAgentId(id);
            }
          }}
        >
          {picker.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="albedo-icon-btn"
          title="Attach file"
          aria-label="Attach file"
          onClick={() => fileRef.current?.click()}
        >
          <i className="bi bi-paperclip" />
        </button>
        <input ref={fileRef} className="d-none" type="file" onChange={onAttach} />
        <select
          className="form-select form-select-sm albedo-message-pipeline"
          aria-label="Pipeline"
          value={pipelineId}
          disabled={pipelines.length === 0}
          onChange={(event) => {
            const id = event.target.value;
            setPipelineId(id);
            if (id) {
              writeLastPipelineId(id);
            }
          }}
        >
          {pipelines.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="albedo-icon-btn"
          title="Clear input"
          aria-label="Clear input"
          onClick={clearComposer}
        >
          <i className="bi bi-trash" />
        </button>
        {running || loopStatus === 'running' ? (
          <button
            type="button"
            className="btn btn-sm btn-albedo-primary"
            title="Stop"
            aria-label="Stop"
            onClick={() => void stop()}
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-albedo-primary"
            disabled={!canSend}
            title="Send"
            aria-label="Send"
            onClick={() => void send()}
          >
            Send
          </button>
        )}
      </div>
      <div className="albedo-message-composer">
        <div className="albedo-composer-tokens" aria-live="polite">
          Tokens: {estimatePromptTokens(draft)}
        </div>
        <MarkdownPrompt showToolbar={false} value={draft} onChange={setDraft} onKeyDown={onPromptKey} />
      </div>
      {attach ? (
        <div className="albedo-attach">
          <FileGlyph name={attach.name} kind="file" />
          <span className="albedo-attach-name">{attach.name}</span>
          <span className="albedo-attach-size">{formatSize(attach.size)}</span>
        </div>
      ) : null}
    </div>
  );
}

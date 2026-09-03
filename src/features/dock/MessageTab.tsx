import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import { llmApi } from '../../api/llmApi';
import type { LlmAgent } from '../../api/llmApi';
import { humanMessage } from '../../api/errors';
import { workspaceApi } from '../../api/workspaceApi';
import { MarkdownPrompt } from '../ai/MarkdownPrompt';
import { toast } from '../../shared/toast/toastStore';
import { FileGlyph } from '../../shared/ui/FileGlyph';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';

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
  const session = tabs.find((item) => item.id === focused) ?? sessions.find((item) => item.id === focused);
  const [draft, setDraft] = useState('');
  const [agentId, setAgentId] = useState('');
  const [agents, setAgents] = useState<LlmAgent[]>([]);
  const [attach, setAttach] = useState<LocalAttach | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canSend = Boolean(session) && Boolean(draft.trim());

  useEffect(() => {
    let cancelled = false;
    llmApi
      .listAgents()
      .then((items) => {
        if (!cancelled) {
          setAgents(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAgents([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearComposer = (): void => {
    setDraft('');
    setAttach(null);
  };

  const send = async (): Promise<void> => {
    if (!session || !draft.trim()) {
      return;
    }
    try {
      await workspaceApi.postMessage(session.workspaceId, session.id, 'user', draft.trim());
      clearComposer();
      bumpChatRev();
    } catch (err) {
      toast(humanMessage(err));
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
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="albedo-message-tab">
      <div className="albedo-message-tools">
        <select
          className="form-select form-select-sm albedo-message-agent"
          aria-label="Agent"
          value={agentId}
          onChange={(event) => setAgentId(event.target.value)}
        >
          <option value="">{agents.length ? 'Agent' : 'No agents'}</option>
          {agents.map((agent) => (
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
          disabled
          title="Pipelines: no RPC yet"
        />
        <button
          type="button"
          className="albedo-icon-btn"
          title="Clear input"
          aria-label="Clear input"
          onClick={clearComposer}
        >
          <i className="bi bi-trash" />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-albedo-primary"
          disabled={!canSend}
          onClick={() => void send()}
        >
          Send
        </button>
      </div>
      <MarkdownPrompt showToolbar={false} value={draft} onChange={setDraft} onKeyDown={onPromptKey} />
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

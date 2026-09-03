import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import type { AgentKind, LlmAgent, LlmProvider } from '../../api/llmApi';
import { llmApi } from '../../api/llmApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Avatar } from '../../shared/ui/Avatar';
import { readImageFile } from '../../shared/ui/readImageFile';
import { Window } from '../../shared/ui/Window';
import { MarkdownPrompt } from './MarkdownPrompt';

export type AgentFormMode = { kind: 'create' } | { kind: 'edit'; agent: LlmAgent };

interface AgentFormProps {
  mode: AgentFormMode | null;
  providers: LlmProvider[];
  onClose: () => void;
  onSaved: () => void;
}

const KINDS: { id: Exclude<AgentKind, 'system' | 'user'>; label: string }[] = [
  { id: 'agent', label: 'Agent' },
  { id: 'subagent', label: 'Subagent' },
  { id: 'cronagent', label: 'Cronagent' },
];

function asKind(value: AgentKind): Exclude<AgentKind, 'system' | 'user'> {
  if (value === 'subagent' || value === 'cronagent' || value === 'agent') {
    return value;
  }
  return 'agent';
}

export function AgentForm({ mode, providers, onClose, onSaved }: AgentFormProps): ReactElement {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Exclude<AgentKind, 'system' | 'user'>>('agent');
  const [model, setModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = mode?.kind === 'edit';

  useEffect(() => {
    if (!mode) {
      return;
    }
    if (mode.kind === 'edit') {
      setName(mode.agent.name);
      setKind(asKind(mode.agent.agentType));
      setModel(mode.agent.model);
      setPrompt(mode.agent.systemPrompt);
      setAvatarUrl(mode.agent.avatarUrl);
      setAvatarFile(null);
      return;
    }
    setName('');
    setKind('agent');
    setModel('');
    setPrompt('');
    setAvatarUrl(null);
    setAvatarFile(null);
  }, [mode]);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    setSaving(true);
    try {
      let agentId = mode?.kind === 'edit' ? mode.agent.id : null;
      if (mode?.kind === 'edit') {
        await llmApi.updateAgent({
          agentId: mode.agent.id,
          name: name.trim(),
          agentType: kind,
          systemPrompt: prompt,
          model,
        });
      } else {
        const created = await llmApi.createAgent({
          name: name.trim(),
          agentType: kind,
          systemPrompt: prompt,
          model,
        });
        agentId = created.id;
      }
      if (agentId && avatarFile) {
        const packed = await readImageFile(avatarFile);
        await llmApi.setAgentAvatar(agentId, packed.imageB64, packed.contentType);
      }
      toast('Saved', 'ok');
      onSaved();
      onClose();
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Window
      className="albedo-settings"
      windowId="albedo-ai-agent-form"
      parentId="albedo-ai-agents"
      open={Boolean(mode)}
      title={editing ? 'Edit agent' : 'New agent'}
      icon="bi-robot"
      onClose={onClose}
    >
      <form className="albedo-settings-form" onSubmit={(event) => void submit(event)}>
        <div className="albedo-settings-avatar">
          <Avatar label={name || 'Agent'} src={avatarUrl} size={56} />
          <label className="btn btn-albedo-primary btn-sm">
            Upload
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              disabled={saving}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) {
                  return;
                }
                setAvatarFile(file);
                setAvatarUrl(URL.createObjectURL(file));
              }}
            />
          </label>
        </div>
        <label className="form-label" htmlFor="albedo-agent-name">
          Name
        </label>
        <input
          id="albedo-agent-name"
          className="form-control form-control-sm"
          disabled={saving}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="form-label" htmlFor="albedo-agent-kind">
          Type
        </label>
        <select
          id="albedo-agent-kind"
          className="form-select form-select-sm"
          disabled={saving}
          value={kind}
          onChange={(event) => setKind(event.target.value as Exclude<AgentKind, 'system' | 'user'>)}
        >
          {KINDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="form-label" htmlFor="albedo-agent-model">
          Model
        </label>
        <select
          id="albedo-agent-model"
          className="form-select form-select-sm"
          disabled={saving}
          value={model}
          onChange={(event) => setModel(event.target.value)}
        >
          <option value="">Select model…</option>
          {providers.map((provider) => {
            const models = provider.models.filter((item) => item.enabled);
            if (!models.length) {
              return null;
            }
            return (
              <optgroup key={provider.id} label={provider.name}>
                {models.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <label className="form-label">System prompt</label>
        <MarkdownPrompt value={prompt} disabled={saving} onChange={setPrompt} />
        <label className="form-label">Tools</label>
        <p className="albedo-ai-muted">Permissions will be configured later.</p>
        <div className="albedo-confirm-actions">
          <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={!name.trim() || saving}>
            {editing ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Window>
  );
}

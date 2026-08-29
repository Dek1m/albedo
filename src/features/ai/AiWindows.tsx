import { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { llmApi } from '../../api/llmApi';
import type { LlmProvider } from '../../api/llmApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { Window } from '../../shared/ui/Window';
import type { AiPane } from './AiMenu';

interface AiWindowsProps {
  pane: AiPane | null;
  onClose: () => void;
}

export function AiWindows({ pane, onClose }: AiWindowsProps): ReactElement {
  const [addOpen, setAddOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [listTick, setListTick] = useState(0);

  useEffect(() => {
    if (pane !== 'providers') {
      setAddOpen(false);
      setKeyOpen(false);
      setOauthOpen(false);
    }
  }, [pane]);

  return (
    <>
      <Window className="albedo-ai-agents" open={pane === 'agents'} title="Agents" onClose={onClose}>
        <p className="albedo-ai-muted">Список агентов появится здесь.</p>
      </Window>
      <Window className="albedo-ai-models" open={pane === 'models'} title="Models" onClose={onClose}>
        <p className="albedo-ai-muted">Каталог моделей — после настройки провайдера.</p>
      </Window>
      <Window
        className="albedo-ai-providers"
        open={pane === 'providers'}
        title="Providers"
        onClose={onClose}
      >
        <ProviderList
          onAdd={() => setAddOpen(true)}
          visible={pane === 'providers'}
          tick={listTick}
        />
      </Window>
      <Window
        className="albedo-ai-provider-add"
        open={addOpen}
        title="Add provider"
        onClose={() => setAddOpen(false)}
      >
        <p className="albedo-ai-muted">Тип входа.</p>
        <div className="albedo-ai-choice">
          <button
            type="button"
            className="btn btn-sm btn-albedo-primary albedo-ai-choice-btn"
            onClick={() => {
              setAddOpen(false);
              setOauthOpen(true);
            }}
          >
            Grok · OAuth
          </button>
          <button
            type="button"
            className="btn btn-sm albedo-ghost-btn albedo-ai-choice-btn"
            onClick={() => {
              setAddOpen(false);
              setKeyOpen(true);
            }}
          >
            API key
          </button>
        </div>
      </Window>
      <ApiKeyWindow
        open={keyOpen}
        onClose={() => setKeyOpen(false)}
        onSaved={() => setListTick((value) => value + 1)}
      />
      <GrokOauthWindow open={oauthOpen} onClose={() => setOauthOpen(false)} />
    </>
  );
}

function ProviderList({
  onAdd,
  visible,
  tick,
}: {
  onAdd: () => void;
  visible: boolean;
  tick: number;
}): ReactElement {
  const [items, setItems] = useState<LlmProvider[]>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    void llmApi
      .listProviders()
      .then(setItems)
      .catch((err: unknown) => toast(humanMessage(err)));
  }, [visible, tick]);

  return (
    <>
      {items.length === 0 ? (
        <p className="albedo-ai-muted">Провайдеров пока нет.</p>
      ) : (
        <ul className="list-group albedo-ai-list">
          {items.map((item) => (
            <li key={item.id} className="list-group-item albedo-ai-list-item">
              <span>{item.name}</span>
              <span className="albedo-ai-muted">{item.kind === 'oauth' ? item.vendor : 'api key'}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-sm btn-albedo-primary mt-2" onClick={onAdd}>
        Add provider
      </button>
    </>
  );
}

function ApiKeyWindow({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}): ReactElement {
  const [name, setName] = useState('openai');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      await llmApi.createProvider({
        name: name.trim(),
        kind: 'api_key',
        vendor: 'openai',
        baseUrl: baseUrl.trim(),
        defaultModel: model.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
      });
      toast('Провайдер сохранён');
      onClose();
      onSaved();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <Window className="albedo-ai-provider-key" open={open} title="API key" onClose={onClose}>
      <form className="albedo-ai-form" onSubmit={(event) => void submit(event)}>
        <label className="form-label" htmlFor="ai-prov-name">
          Name
        </label>
        <input id="ai-prov-name" className="form-control form-control-sm" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="form-label" htmlFor="ai-prov-url">
          Base URL
        </label>
        <input id="ai-prov-url" className="form-control form-control-sm" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        <label className="form-label" htmlFor="ai-prov-model">
          Default model
        </label>
        <input id="ai-prov-model" className="form-control form-control-sm" value={model} onChange={(e) => setModel(e.target.value)} />
        <label className="form-label" htmlFor="ai-prov-key">
          API key
        </label>
        <input
          id="ai-prov-key"
          className="form-control form-control-sm"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div className="albedo-ai-actions">
          <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-sm btn-albedo-primary" disabled={!name.trim()}>
            Save
          </button>
        </div>
      </form>
    </Window>
  );
}

function GrokOauthWindow({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const connect = async (): Promise<void> => {
    try {
      const result = await llmApi.startOauth('grok');
      toast(result.status === 'stub' ? 'Grok OAuth — заглушка, ключ пока через API key' : result.status);
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <Window className="albedo-ai-provider-oauth" open={open} title="Grok OAuth" onClose={onClose}>
      <p className="albedo-ai-muted">Вход через Grok. Поток OAuth ещё пустышка — вызов идёт на воркер.</p>
      <div className="albedo-ai-actions">
        <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-sm btn-albedo-primary" onClick={() => void connect()}>
          Connect Grok
        </button>
      </div>
    </Window>
  );
}

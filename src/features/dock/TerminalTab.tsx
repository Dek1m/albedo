import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { humanMessage } from '../../api/errors';
import { termApi } from '../../api/termApi';
import type { TermSession } from '../../api/termApi';
import { toast } from '../../shared/toast/toastStore';

export function TerminalTab(): ReactElement {
  const [sessions, setSessions] = useState<TermSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const [command, setCommand] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const items = await termApi.listSessions();
      setSessions(items);
      setSelected((current) => current ?? items[0]?.id ?? null);
    } catch (err) {
      toast(humanMessage(err));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async (): Promise<void> => {
    try {
      const created = await termApi.createSession();
      await reload();
      setSelected(created.id);
      setOutput('');
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const drop = async (): Promise<void> => {
    if (!selected) {
      return;
    }
    try {
      await termApi.deleteSession(selected);
      setSelected(null);
      setOutput('');
      await reload();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const run = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!selected || !command.trim() || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await termApi.exec(selected, command.trim());
      const chunk = [
        `$ ${command.trim()}`,
        result.stdout,
        result.stderr,
        result.exitCode !== 0 ? `[exit ${String(result.exitCode)}]` : '',
      ]
        .filter(Boolean)
        .join('\n');
      setOutput((prev) => (prev ? `${prev}\n${chunk}` : chunk));
      setCommand('');
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="albedo-term-tab">
      <div className="albedo-term-main">
        <pre className="albedo-term-out">{output || 'Ready. Allowlisted commands: ls, pwd, id, echo, date, whoami, uname, cat, head, tail, wc, env.'}</pre>
        <form className="albedo-term-input" onSubmit={(event) => void run(event)}>
          <input
            className="form-control form-control-sm"
            value={command}
            disabled={!selected || busy}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={selected ? 'command…' : 'Create a session'}
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>
      <aside className="albedo-term-sessions">
        <div className="albedo-term-session-bar">
          <button type="button" className="albedo-icon-btn" title="New session" aria-label="New session" onClick={() => void create()}>
            +
          </button>
          <button
            type="button"
            className="albedo-icon-btn"
            title="Delete session"
            aria-label="Delete session"
            disabled={!selected}
            onClick={() => void drop()}
          >
            <i className="bi bi-trash" />
          </button>
        </div>
        <ul className="albedo-term-session-list">
          {sessions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`albedo-sidebar-session${selected === item.id ? ' is-focused' : ''}`}
                onClick={() => setSelected(item.id)}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

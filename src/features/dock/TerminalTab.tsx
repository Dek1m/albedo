import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { humanMessage } from '../../api/errors';
import { termApi, termPtyUrl } from '../../api/termApi';
import type { TermSession } from '../../api/termApi';
import { toast } from '../../shared/toast/toastStore';

export function TerminalTab(): ReactElement {
  const [sessions, setSessions] = useState<TermSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

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

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !selected) {
      return;
    }
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 13,
      theme: {
        background: '#0a0a0b',
        foreground: '#d8d8d8',
        cursor: '#4e9a06',
        cursorAccent: '#0a0a0b',
        selectionBackground: '#3465a4',
        black: '#000000',
        red: '#cc0000',
        green: '#4e9a06',
        yellow: '#c4a000',
        blue: '#3465a4',
        magenta: '#75507b',
        cyan: '#06989a',
        white: '#d3d7cf',
        brightBlack: '#555753',
        brightRed: '#ef2929',
        brightGreen: '#8ae234',
        brightYellow: '#fce94f',
        brightBlue: '#729fcf',
        brightMagenta: '#ad7fa8',
        brightCyan: '#34e2e2',
        brightWhite: '#eeeeec',
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    fit.fit();
    termRef.current = term;
    const socket = new WebSocket(termPtyUrl(selected));
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;
    socket.addEventListener('open', () => {
      const dims = fit.proposeDimensions();
      if (dims) {
        socket.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
      }
    });
    socket.addEventListener('message', (event: MessageEvent<ArrayBuffer | string>) => {
      if (typeof event.data === 'string') {
        term.write(event.data);
        return;
      }
      term.write(new Uint8Array(event.data));
    });
    socket.addEventListener('close', () => {
      term.write('\r\n\x1b[31mdisconnected\x1b[0m\r\n');
    });
    const dataSub = term.onData((chunk) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(chunk);
      }
    });
    const resizeSub = term.onResize((size) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols: size.cols, rows: size.rows }));
      }
    });
    const onWin = (): void => {
      fit.fit();
    };
    window.addEventListener('resize', onWin);
    return () => {
      window.removeEventListener('resize', onWin);
      dataSub.dispose();
      resizeSub.dispose();
      socket.close();
      term.dispose();
      termRef.current = null;
      socketRef.current = null;
    };
  }, [selected]);

  const create = async (): Promise<void> => {
    try {
      const created = await termApi.createSession();
      await reload();
      setSelected(created.id);
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
      await reload();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <div className="albedo-term-tab">
      <div className="albedo-term-main">
        {selected ? <div ref={hostRef} className="albedo-term-xterm" /> : <div className="albedo-term-empty">Create a session</div>}
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

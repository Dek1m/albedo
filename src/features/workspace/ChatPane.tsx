import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import { useAuthStore } from '../../auth/AuthStore';
import { chipLabel } from '../../domain/user';
import type { ChatMessage } from '../../domain/workspace';
import { MarkdownView } from '../../shared/ui/MarkdownView';
import { toast } from '../../shared/toast/toastStore';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';

function formatSentAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPane(): ReactElement | null {
  const active = useWorkspaceStore((s) => s.active);
  const focused = useWorkspaceStore((s) => s.focusedSessionId);
  const sessions = useWorkspaceStore((s) => s.sessions);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const chatRev = useWorkspaceStore((s) => s.chatRev);
  const setComposerDraft = useWorkspaceStore((s) => s.setComposerDraft);
  const setDockTab = useWorkspaceStore((s) => s.setDockTab);
  const profile = useAuthStore((s) => s.profile);
  const session = tabs.find((s) => s.id === focused) ?? sessions.find((s) => s.id === focused);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const userName = profile ? chipLabel(profile) : 'You';

  useEffect(() => {
    const workspaceId = session?.workspaceId ?? active?.id;
    if (!workspaceId || !focused) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    workspaceApi
      .listMessages(workspaceId, focused)
      .then((items) => {
        if (!cancelled) {
          setMessages(items);
        }
      })
      .catch((err) => toast(humanMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [active, focused, session?.workspaceId, chatRev]);

  if (!session) {
    return <p className="albedo-workspace-ready">ready</p>;
  }

  const copyText = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied', 'ok');
    } catch {
      toast('Copy failed');
    }
  };

  return (
    <section className="albedo-chat">
      <div className="albedo-chat-log">
        {messages.map((msg) => {
          const mine = msg.role === 'user';
          const clock = formatSentAt(msg.createdAt);
          return (
            <article key={msg.id} className={`albedo-bubble${mine ? ' albedo-bubble--user' : ' albedo-bubble--agent'}`}>
              <header>{mine ? userName : 'Agent'}</header>
              <MarkdownView text={msg.content ?? ''} />
              {mine ? (
                <footer className="albedo-bubble-meta">
                  <span className="albedo-bubble-meta-facts">
                    {msg.agentName ? (
                      <>
                        <span>{msg.agentName}</span>
                        <span className="albedo-meta-dot" aria-hidden>
                          ·
                        </span>
                      </>
                    ) : null}
                    {msg.modelName ? (
                      <>
                        <span>{msg.modelName}</span>
                        <span className="albedo-meta-dot" aria-hidden>
                          ·
                        </span>
                      </>
                    ) : null}
                    {clock ? <time dateTime={msg.createdAt}>{clock}</time> : null}
                  </span>
                  <span className="albedo-bubble-meta-actions">
                    <button
                      type="button"
                      className="albedo-icon-btn"
                      title="Copy"
                      aria-label="Copy"
                      onClick={() => void copyText(msg.content ?? '')}
                    >
                      <i className="bi bi-copy" />
                    </button>
                    <button
                      type="button"
                      className="albedo-icon-btn"
                      title="Edit"
                      aria-label="Edit"
                      onClick={() => {
                        setComposerDraft(msg.content ?? '');
                        setDockTab('message');
                      }}
                    >
                      <i className="bi bi-pencil" />
                    </button>
                  </span>
                </footer>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

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

export function ChatPane(): ReactElement | null {
  const active = useWorkspaceStore((s) => s.active);
  const focused = useWorkspaceStore((s) => s.focusedSessionId);
  const sessions = useWorkspaceStore((s) => s.sessions);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const chatRev = useWorkspaceStore((s) => s.chatRev);
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

  return (
    <section className="albedo-chat">
      <div className="albedo-chat-log">
        {messages.map((msg) => {
          const mine = msg.role === 'user';
          return (
            <article key={msg.id} className={`albedo-bubble${mine ? ' albedo-bubble--user' : ' albedo-bubble--agent'}`}>
              <header>{mine ? userName : 'Agent'}</header>
              <MarkdownView text={msg.content ?? ''} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

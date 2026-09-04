import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import { useAuthStore } from '../../auth/AuthStore';
import { chipLabel } from '../../domain/user';
import type { ChatMessage } from '../../domain/workspace';
import { copyText } from '../../shared/copyText';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { MarkdownView } from '../../shared/ui/MarkdownView';
import { toast } from '../../shared/toast/toastStore';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { useLoopMetrics } from '../dock/loopMetrics';
import { AgentBubble } from './AgentBubble';
import { siblingsOf, visiblePath, withParents } from './chatBranches';

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
  const branchPick = useWorkspaceStore((s) => s.branchPick);
  const setBranchPick = useWorkspaceStore((s) => s.setBranchPick);
  const setComposerDraft = useWorkspaceStore((s) => s.setComposerDraft);
  const setComposerParentId = useWorkspaceStore((s) => s.setComposerParentId);
  const setDockTab = useWorkspaceStore((s) => s.setDockTab);
  const setThreadTailId = useWorkspaceStore((s) => s.setThreadTailId);
  const profile = useAuthStore((s) => s.profile);
  const session = tabs.find((s) => s.id === focused) ?? sessions.find((s) => s.id === focused);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const userName = profile ? chipLabel(profile) : 'You';
  const logRef = useRef<HTMLDivElement>(null);
  const loopStatus = useLoopMetrics((s) => s.status);
  const liveTrace = useLoopMetrics((s) => s.trace);
  const liveAgent = useLoopMetrics((s) => s.agentName);

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

  const tree = useMemo(() => withParents(messages), [messages]);
  const visible = useMemo(() => visiblePath(tree, branchPick), [tree, branchPick]);
  const live = loopStatus === 'running';

  useEffect(() => {
    setThreadTailId(visible.at(-1)?.id ?? null);
  }, [visible, setThreadTailId]);

  useEffect(() => {
    const node = logRef.current;
    if (!node) {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [visible, live, liveTrace.content, liveTrace.reasoning, chatRev]);

  if (!session) {
    return <p className="albedo-workspace-ready">ready</p>;
  }

  const onCopy = async (text: string): Promise<void> => {
    try {
      await copyText(text);
      toast('Copied', 'ok');
    } catch {
      toast('Copy failed');
    }
  };

  const dropBranch = async (): Promise<void> => {
    if (!pendingDelete) {
      return;
    }
    try {
      await workspaceApi.deleteBranch(session.workspaceId, session.id, pendingDelete.id);
      setPendingDelete(null);
      useWorkspaceStore.getState().bumpChatRev();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <section className="albedo-chat">
      <div ref={logRef} className="albedo-chat-log">
        {visible.map((msg) => {
          const mine = msg.role === 'user';
          const clock = formatSentAt(msg.createdAt);
          const forks = mine ? siblingsOf(tree, msg) : [];
          const forkIndex = forks.findIndex((item) => item.id === msg.id);
          if (!mine) {
            return (
              <AgentBubble
                key={msg.id}
                name={msg.agentName || 'Agent'}
                content={msg.content ?? ''}
                reasoning={msg.reasoning ?? ''}
                stages={msg.stages}
              />
            );
          }
          return (
            <article key={msg.id} className="albedo-bubble albedo-bubble--user">
              <header>{userName}</header>
              <MarkdownView text={msg.content ?? ''} />
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
                {forks.length > 1 ? (
                  <span className="albedo-branch-nav">
                    <button
                      type="button"
                      className="albedo-icon-btn"
                      aria-label="Previous branch"
                      disabled={forkIndex <= 0}
                      onClick={() => {
                        const prev = forks[forkIndex - 1];
                        if (prev) {
                          setBranchPick(msg.parentId ?? '', prev.id);
                        }
                      }}
                    >
                      <i className="bi bi-chevron-left" />
                    </button>
                    <span>
                      {forkIndex + 1}/{forks.length}
                    </span>
                    <button
                      type="button"
                      className="albedo-icon-btn"
                      aria-label="Next branch"
                      disabled={forkIndex >= forks.length - 1}
                      onClick={() => {
                        const next = forks[forkIndex + 1];
                        if (next) {
                          setBranchPick(msg.parentId ?? '', next.id);
                        }
                      }}
                    >
                      <i className="bi bi-chevron-right" />
                    </button>
                  </span>
                ) : null}
                <span className="albedo-bubble-meta-actions">
                  <button
                    type="button"
                    className="albedo-icon-btn"
                    title="Copy"
                    aria-label="Copy"
                    onClick={() => void onCopy(msg.content ?? '')}
                  >
                    <i className="bi bi-clipboard" />
                  </button>
                  <button
                    type="button"
                    className="albedo-icon-btn"
                    title="Edit"
                    aria-label="Edit"
                    onClick={() => {
                      setComposerDraft(msg.content ?? '');
                      setComposerParentId(msg.parentId);
                      setDockTab('message');
                    }}
                  >
                    <i className="bi bi-pencil" />
                  </button>
                  <button
                    type="button"
                    className="albedo-icon-btn"
                    title="Delete branch"
                    aria-label="Delete branch"
                    onClick={() => setPendingDelete(msg)}
                  >
                    <i className="bi bi-trash" />
                  </button>
                </span>
              </footer>
            </article>
          );
        })}
        {live ? (
          <AgentBubble
            name={liveAgent || 'Agent'}
            content={liveTrace.content}
            reasoning={liveTrace.reasoning}
            stages={liveTrace.stages}
            live
          />
        ) : null}
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete branch"
        body="Delete this branch and all messages after it? This cannot be undone."
        confirmLabel="Delete"
        danger
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void dropBranch()}
      />
    </section>
  );
}

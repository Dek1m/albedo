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
import { useChatRun } from './chatRun';
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
  const requestRegen = useChatRun((s) => s.requestRegen);
  const profile = useAuthStore((s) => s.profile);
  const session = tabs.find((s) => s.id === focused) ?? sessions.find((s) => s.id === focused);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const userName = profile ? chipLabel(profile) : 'You';
  const logRef = useRef<HTMLDivElement>(null);
  const loopStatus = useLoopMetrics((s) => s.status);
  const liveTrace = useLoopMetrics((s) => s.trace);
  const liveAgent = useLoopMetrics((s) => s.agentName);
  const liveModel = useLoopMetrics((s) => s.modelName);

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
  const last = visible.at(-1);
  const history = last?.role === 'assistant' ? visible.slice(0, -1) : visible;
  const assistant = last?.role === 'assistant' ? last : null;
  const streaming = loopStatus === 'running' || (!assistant && Boolean(liveTrace.content || liveTrace.reasoning));

  useEffect(() => {
    setThreadTailId(visible.at(-1)?.id ?? null);
  }, [visible, setThreadTailId]);

  const tailId = visible.at(-1)?.id;
  useEffect(() => {
    const node = logRef.current;
    if (!node || loopStatus === 'running') {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [tailId, loopStatus, chatRev]);

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
        {history.map((msg) => {
          if (msg.role === 'assistant') {
            return (
              <div key={msg.id} className="albedo-agent-wrap">
                <AgentBubble
                  name={msg.agentName || 'Agent'}
                  content={msg.content ?? ''}
                  reasoning={msg.reasoning ?? ''}
                  stages={msg.stages}
                />
                <footer className="albedo-agent-meta">
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
                    title="Regenerate"
                    aria-label="Regenerate"
                    disabled={!msg.parentId}
                    onClick={() => {
                      if (!msg.parentId) {
                        return;
                      }
                      requestRegen({ assistantId: msg.id, parentId: msg.parentId });
                    }}
                  >
                    <i className="bi bi-arrow-repeat" />
                  </button>
                  {msg.createdAt ? <time dateTime={msg.createdAt}>{formatSentAt(msg.createdAt)}</time> : null}
                  {msg.modelName ? <span>{msg.modelName}</span> : null}
                </footer>
              </div>
            );
          }
          const clock = formatSentAt(msg.createdAt);
          const forks = siblingsOf(tree, msg);
          const forkIndex = forks.findIndex((item) => item.id === msg.id);
          return (
            <div key={msg.id} className="albedo-user-wrap">
              <article className="albedo-bubble albedo-bubble--user">
                <header>{userName}</header>
                <MarkdownView text={msg.content ?? ''} />
              </article>
              <footer className="albedo-user-meta">
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
                {clock ? <time dateTime={msg.createdAt}>{clock}</time> : null}
              </footer>
            </div>
          );
        })}
        {assistant || streaming ? (
          <div className="albedo-agent-wrap">
            <AgentBubble
              name={streaming ? liveAgent || assistant?.agentName || 'Agent' : assistant?.agentName || 'Agent'}
              content={streaming ? liveTrace.content || assistant?.content || '' : assistant?.content ?? ''}
              reasoning={streaming ? liveTrace.reasoning : assistant?.reasoning ?? ''}
              stages={streaming ? liveTrace.stages : assistant?.stages ?? []}
              live={streaming}
            />
            <footer className="albedo-agent-meta">
              <button
                type="button"
                className="albedo-icon-btn"
                title="Copy"
                aria-label="Copy"
                disabled={streaming}
                onClick={() => void onCopy(assistant?.content || liveTrace.content)}
              >
                <i className="bi bi-clipboard" />
              </button>
              <button
                type="button"
                className="albedo-icon-btn"
                title="Regenerate"
                aria-label="Regenerate"
                disabled={streaming || !assistant}
                onClick={() => {
                  if (!assistant?.parentId) {
                    return;
                  }
                  requestRegen({ assistantId: assistant.id, parentId: assistant.parentId });
                }}
              >
                <i className="bi bi-arrow-repeat" />
              </button>
              {assistant?.createdAt && !streaming ? (
                <time dateTime={assistant.createdAt}>{formatSentAt(assistant.createdAt)}</time>
              ) : null}
              <span>{streaming ? liveModel : assistant?.modelName || liveModel}</span>
            </footer>
          </div>
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

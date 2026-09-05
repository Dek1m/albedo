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
import { shouldShowLive, useLoopMetrics } from '../dock/loopMetrics';
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
  const setComposerParent = useWorkspaceStore((s) => s.setComposerParent);
  const setDockTab = useWorkspaceStore((s) => s.setDockTab);
  const setThreadTailId = useWorkspaceStore((s) => s.setThreadTailId);
  const setThreadTailMeta = useWorkspaceStore((s) => s.setThreadTailMeta);
  const requestRegen = useChatRun((s) => s.requestRegen);
  const profile = useAuthStore((s) => s.profile);
  const session = tabs.find((s) => s.id === focused) ?? sessions.find((s) => s.id === focused);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const userName = profile ? chipLabel(profile) : 'You';
  const logRef = useRef<HTMLDivElement>(null);
  const loopStatus = useLoopMetrics((s) => s.status);
  const loopSessionId = useLoopMetrics((s) => s.sessionId);
  const liveAgent = useLoopMetrics((s) => s.agentName);
  // Примитивные селекторы: идентичный тик не меняет ссылки — панель не рендерится.
  const liveContent = useLoopMetrics((s) => s.trace.content);
  const liveReasoning = useLoopMetrics((s) => s.trace.reasoning);
  const liveStages = useLoopMetrics((s) => s.trace.stages);
  const scrollRequest = useWorkspaceStore((s) => s.scrollRequest);

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
  // История рисует всё; live-облачко — только стрим своей сессии, без фантомов при переключении вкладок.
  const history = visible;
  const streaming = loopStatus === 'running' && shouldShowLive(loopSessionId, focused);

  useEffect(() => {
    const tail = visible.at(-1) ?? null;
    setThreadTailId(tail?.id ?? null);
    setThreadTailMeta({ role: tail?.role ?? null, parentId: tail?.parentId ?? null });
  }, [visible, setThreadTailId, setThreadTailMeta]);

  const tailId = visible.at(-1)?.id;
  const stickRef = useRef(true);
  const scrollRafRef = useRef(0);
  const [reasoningOpen, setReasoningOpen] = useState(false);

  useEffect(() => () => cancelAnimationFrame(scrollRafRef.current), []);

  // Новый цикл — панель reasoning прошлого ответа закрыта (rising edge).
  useEffect(() => {
    if (streaming) {
      setReasoningOpen(false);
    }
  }, [streaming]);

  // Пока пользователь у дна — следуем за потоком. Прокрутил вверх — отпускаем.
  const onLogScroll = (): void => {
    const node = logRef.current;
    if (!node) {
      return;
    }
    stickRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
  };

  // Собственная отправка/реген — вниз всегда, даже если лента была прокручена вверх.
  useEffect(() => {
    const node = logRef.current;
    if (!scrollRequest || !node) {
      return;
    }
    stickRef.current = true;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [scrollRequest]);

  // Новые сообщения и смена статуса — следуем вниз, только когда пользователь у дна.
  useEffect(() => {
    const node = logRef.current;
    if (!node || !stickRef.current) {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [tailId, loopStatus, chatRev]);

  // Поток ответа: reasoning скроллим только при раскрытой панели, текст — у дна; не чаще кадра.
  useEffect(() => {
    const node = logRef.current;
    if (!node || !streaming || !stickRef.current || scrollRafRef.current) {
      return;
    }
    const inReasoning = Boolean(liveReasoning) && !liveContent;
    if (inReasoning && !reasoningOpen) {
      return;
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    });
  }, [streaming, liveContent, liveReasoning, reasoningOpen]);

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
      <div ref={logRef} className="albedo-chat-log" onScroll={onLogScroll}>
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
                    disabled={!msg.parentId || streaming}
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
                    // id null — явное намерение ответить в корень, а не «цель не задана».
                    setComposerParent({ id: msg.parentId });
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
        {streaming ? (
          <div className="albedo-agent-wrap">
            <AgentBubble
              name={liveAgent || 'Agent'}
              content={liveContent}
              reasoning={liveReasoning}
              stages={liveStages}
              live
              reasoningOpen={reasoningOpen}
              onReasoningToggle={() => setReasoningOpen((value) => !value)}
            />
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

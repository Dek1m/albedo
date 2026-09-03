import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import type { GitRepo } from '../../api/workspaceApi';
import { GitBranch } from './GitBranch';
import { humanMessage } from '../../api/errors';
import { asSessionId, type WsNode } from '../../domain/workspace';
import { toast } from '../../shared/toast/toastStore';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { PanelGrip } from '../../shared/ui/PanelGrip';
import { Window } from '../../shared/ui/Window';
import { PromptDialog } from '../../shared/ui/PromptDialog';
import { useClickOutside } from '../../shared/ui/useClickOutside';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { folderToast, pathTail } from './folderToast';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { HomeTree } from './HomeTree';
import { WorkspaceDiskTree } from './WorkspaceDiskTree';

export function WorkspaceSidebar(): ReactElement | null {
  const active = useWorkspaceStore((s) => s.active);
  const width = useWorkspaceStore((s) => s.sidebarWidth);
  const setWidth = useWorkspaceStore((s) => s.setSidebarWidth);
  const foldersOpen = useWorkspaceStore((s) => s.foldersOpen);
  const setFoldersOpen = useWorkspaceStore((s) => s.setFoldersOpen);
  const sessions = useWorkspaceStore((s) => s.sessions);
  const focused = useWorkspaceStore((s) => s.focusedSessionId);
  const setSessions = useWorkspaceStore((s) => s.setSessions);
  const setFocused = useWorkspaceStore((s) => s.setFocused);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [nodes, setNodes] = useState<WsNode[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [selectedRel, setSelectedRel] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ rel: string; body: string } | null>(null);
  const [filePrompt, setFilePrompt] = useState(false);
  const [diskRev, setDiskRev] = useState(0);
  const [gitRepos, setGitRepos] = useState<GitRepo[]>([]);
  const [busy, setBusy] = useState(true);
  const kebab = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useClickOutside(menuOpen, kebab, closeMenu);

  const reload = useCallback(async (): Promise<void> => {
    if (!active) {
      return;
    }
    setBusy(true);
    try {
      setNodes(await workspaceApi.listNodes(active.id, null));
      try {
        setGitRepos(await workspaceApi.listGit(active.id));
      } catch {
        setGitRepos([]);
      }
    } finally {
      setBusy(false);
    }
  }, [active]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!active) {
    return null;
  }

  const addFolder = (): void => {
    setMenuOpen(false);
    setPicked(new Set(nodes.map((node) => node.relPath)));
    setPickerOpen(true);
  };

  const toggleLive = async (rel: string): Promise<void> => {
    try {
      if (picked.has(rel)) {
        try {
          await workspaceApi.unlinkHome(active.id, rel);
        } catch {
          /* уже отвязано после trash */
        }
        setPicked((prev) => {
          const next = new Set(prev);
          next.delete(rel);
          return next;
        });
      } else {
        await workspaceApi.linkHome(active.id, rel);
        setPicked((prev) => new Set(prev).add(rel));
      }
      await reload();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const createFile = async (name: string): Promise<void> => {
    const parent = selectedRel ?? '';
    try {
      await workspaceApi.createHome(name, parent, 'file');
      await reload();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const removeFromWorkspace = async (): Promise<void> => {
    if (!selectedRel) {
      return;
    }
    setMenuOpen(false);
    try {
      await workspaceApi.unlinkHome(active.id, selectedRel);
      folderToast('removed', [pathTail(selectedRel)]);
      setSelectedRel(null);
      await reload();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const askTrash = async (): Promise<void> => {
    if (!selectedRel) {
      return;
    }
    setMenuOpen(false);
    try {
      const stat = await workspaceApi.homeStat(selectedRel);
      const body =
        stat.kind === 'folder' && stat.childCount > 0
          ? `В «${selectedRel}» есть файлы и папки. Удалить всё с диска и из workspace?`
          : `Удалить «${selectedRel}» с диска и из workspace?`;
      setAsk({ rel: selectedRel, body });
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const runTrash = async (rel: string): Promise<void> => {
    try {
      await workspaceApi.trashHome(rel, active.id);
      folderToast('deleted', [pathTail(rel)]);
      setSelectedRel(null);
      await reload();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <aside
      className="albedo-sidebar"
      style={{ width }}
      onClick={(event) => {
        const node = event.target as HTMLElement;
        if (node.closest('.albedo-tree-item, .albedo-kebab, .albedo-ws-drop, .albedo-icon-btn, .albedo-sidebar-fold, .albedo-sidebar-session')) {
          return;
        }
        setSelectedRel(null);
      }}
    >
      <h2 className="albedo-sidebar-title">{active.name}</h2>
      <div className="albedo-sidebar-rule" />
      <div className={`albedo-sidebar-fold-block${sessionsOpen ? ' is-open' : ''}`}>
        <button
          type="button"
          className="albedo-sidebar-fold"
          onClick={() => {
            const next = !sessionsOpen;
            setSessionsOpen(next);
            if (next) {
              setFoldersOpen(false);
            }
          }}
        >
          Sessions
          <i className={`bi ${sessionsOpen ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
        </button>
        <div className={`albedo-fold-body${sessionsOpen ? ' is-open' : ''}`}>
          <div className="albedo-fold-body-inner">
            <div className="albedo-fold-well">
              {busy ? (
                <SkeletonList rows={4} />
              ) : (
                <ul className="albedo-sidebar-sessions">
                  {sessions.map((session) => (
                    <li key={session.id}>
                      <button
                        type="button"
                        className={`albedo-sidebar-session${focused === session.id ? ' is-focused' : ''}`}
                        onClick={() => {
                          void (async () => {
                            try {
                              const opened = await workspaceApi.openSession(active.id, session.id);
                              const list = await workspaceApi.listSessions(active.id);
                              setSessions(list);
                              setFocused(asSessionId(opened.id));
                            } catch (err) {
                              toast(humanMessage(err));
                            }
                          })();
                        }}
                      >
                        {session.title}
                      </button>
                    </li>
                  ))}
                  {!sessions.length ? <li className="albedo-sidebar-empty">No sessions</li> : null}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={`albedo-sidebar-fold-block${foldersOpen ? ' is-open' : ''}`}>
        <button
          type="button"
          className="albedo-sidebar-fold"
          onClick={() => {
            const next = !foldersOpen;
            setFoldersOpen(next);
            if (next) {
              setSessionsOpen(false);
            }
          }}
        >
          Folders & Files
          <i className={`bi ${foldersOpen ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
        </button>
        <div className={`albedo-fold-body${foldersOpen ? ' is-open' : ''}`}>
          <div className="albedo-fold-body-inner">
            <div className="albedo-tree-block">
              <div className="albedo-tree-toolbar">
                <button
                  type="button"
                  className="albedo-icon-btn"
                  title="New folder"
                  onClick={() => {
                    setSelectedRel(null);
                    addFolder();
                  }}
                >
                  <i className="bi bi-folder-plus" />
                </button>
                <div className="albedo-kebab" ref={kebab}>
                  <button type="button" className="albedo-icon-btn" onClick={() => setMenuOpen((v) => !v)}>
                    <i className="bi bi-three-dots-vertical" />
                  </button>
                  {menuOpen ? (
                    <div className="albedo-ws-drop albedo-kebab-drop">
                      <button type="button" className="albedo-ws-drop-item" onClick={addFolder}>
                        New folder
                      </button>
                      <button
                        type="button"
                        className="albedo-ws-drop-item"
                        onClick={() => {
                          setMenuOpen(false);
                          setFilePrompt(true);
                        }}
                      >
                        New file
                      </button>
                      <button type="button" className="albedo-ws-drop-item" disabled>
                        Rename
                      </button>
                      <button type="button" className="albedo-ws-drop-item" disabled>
                        Move to…
                      </button>
                      <button type="button" className="albedo-ws-drop-item" onClick={() => setFoldersOpen(false)}>
                        Collapse all
                      </button>
                      <button type="button" className="albedo-ws-drop-item" onClick={() => setFoldersOpen(true)}>
                        Expand all
                      </button>
                      <button
                        type="button"
                        className="albedo-ws-drop-item"
                        disabled={!selectedRel}
                        onClick={() => void removeFromWorkspace()}
                      >
                        Remove from workspace
                      </button>
                      <button
                        type="button"
                        className="albedo-ws-drop-item"
                        disabled={!selectedRel}
                        onClick={() => void askTrash()}
                      >
                        Delete from disk
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="albedo-fold-well">
                {gitRepos.length === 1 && gitRepos[0] ? (
                  <div className="albedo-git-bar">
                    <GitBranch repo={gitRepos[0]} />
                  </div>
                ) : null}
                {busy ? (
                  <SkeletonList rows={6} />
                ) : (
                  <WorkspaceDiskTree
                    roots={nodes.map((node) => ({
                      name: node.name,
                      relPath: node.relPath,
                      kind: node.kind,
                      git: gitRepos.length > 1 ? gitRepos.find((repo) => repo.relPath === node.relPath) : undefined,
                    }))}
                    workspaceId={active.id}
                    selectedRel={selectedRel}
                    onSelect={(rel) => setSelectedRel(rel)}
                    onMoved={() => {
                      setDiskRev((value) => value + 1);
                      void reload();
                    }}
                    rev={diskRev}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <PanelGrip axis="x" value={width} min={180} max={420} onChange={setWidth} />
      <Window className="albedo-folders" windowId="albedo-folders" open={pickerOpen} title="Add folders" onClose={() => setPickerOpen(false)}>
        <HomeTree
          selected={picked}
          workspaceId={active.id}
          onToggle={(rel) => void toggleLive(rel)}
          onTrashed={() => void reload()}
        />
      </Window>
      <ConfirmDialog
        open={Boolean(ask)}
        title="Удалить"
        body={ask?.body ?? ''}
        confirmLabel="Delete"
        danger
        onClose={() => setAsk(null)}
        onConfirm={() => {
          if (ask) {
            void runTrash(ask.rel);
          }
        }}
      />
      <PromptDialog
        open={filePrompt}
        title="New file"
        label="File name"
        onClose={() => setFilePrompt(false)}
        onSubmit={(name) => void createFile(name)}
      />
    </aside>
  );
}

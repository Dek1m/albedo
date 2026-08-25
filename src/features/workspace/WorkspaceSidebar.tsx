import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import type { NodeId, WsNode } from '../../domain/workspace';
import { toast } from '../../shared/toast/toastStore';
import { Modal } from '../../shared/ui/Modal';
import { useClickOutside } from '../../shared/ui/useClickOutside';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { HomeTree } from './HomeTree';

interface WorkspaceSidebarProps {
  onOpenSessions: () => void;
}

export function WorkspaceSidebar({ onOpenSessions }: WorkspaceSidebarProps): ReactElement | null {
  const active = useWorkspaceStore((s) => s.active);
  const width = useWorkspaceStore((s) => s.sidebarWidth);
  const setWidth = useWorkspaceStore((s) => s.setSidebarWidth);
  const foldersOpen = useWorkspaceStore((s) => s.foldersOpen);
  const setFoldersOpen = useWorkspaceStore((s) => s.setFoldersOpen);
  const [nodes, setNodes] = useState<WsNode[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<NodeId | null>(null);
  const kebab = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useClickOutside(menuOpen, kebab, closeMenu);

  const reload = useCallback(async (): Promise<void> => {
    if (!active) {
      return;
    }
    setNodes(await workspaceApi.listNodes(active.id, null));
  }, [active]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onDrag = (event: ReactMouseEvent): void => {
    event.preventDefault();
    const startX = event.clientX;
    const startW = width;
    const move = (ev: MouseEvent): void => {
      setWidth(Math.min(420, Math.max(180, startW + ev.clientX - startX)));
    };
    const up = (): void => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

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
        await workspaceApi.unlinkHome(active.id, rel);
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

  const addFile = async (): Promise<void> => {
    const name = window.prompt('File name');
    if (!name?.trim()) {
      return;
    }
    try {
      await workspaceApi.createFile(active.id, name.trim(), selected);
      await reload();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const removeSelected = async (): Promise<void> => {
    if (!selected) {
      return;
    }
    try {
      await workspaceApi.deleteNode(active.id, selected);
      setSelected(null);
      setMenuOpen(false);
      await reload();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const trashSelected = async (): Promise<void> => {
    if (!selected) {
      return;
    }
    if (!window.confirm('Удалить файлы на сервере?')) {
      return;
    }
    try {
      await workspaceApi.trashNode(active.id, selected);
      setSelected(null);
      setMenuOpen(false);
      await reload();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <aside className="albedo-sidebar" style={{ width }}>
      <h2 className="albedo-sidebar-title">{active.name}</h2>
      <div className="albedo-sidebar-rule" />
      <button type="button" className="albedo-sidebar-sessions" onClick={onOpenSessions}>
        Sessions
      </button>
      <div className="albedo-sidebar-section">
        <button type="button" className="albedo-sidebar-fold" onClick={() => setFoldersOpen(!foldersOpen)}>
          Folders and files
        </button>
        <button type="button" className="albedo-icon-btn" title="New folder" onClick={() => { setSelected(null); void addFolder(); }}>
          <i className="bi bi-folder-plus" />
        </button>
        <div className="albedo-kebab" ref={kebab}>
          <button type="button" className="albedo-icon-btn" onClick={() => setMenuOpen((v) => !v)}>
            <i className="bi bi-three-dots-vertical" />
          </button>
          {menuOpen ? (
            <div className="albedo-ws-drop albedo-kebab-drop">
              <button type="button" className="albedo-ws-drop-item" onClick={() => void addFolder()}>
                New folder
              </button>
              <button type="button" className="albedo-ws-drop-item" onClick={() => void addFile()}>
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
              <button type="button" className="albedo-ws-drop-item" disabled={!selected} onClick={() => void removeSelected()}>
                Remove from project
              </button>
              <button type="button" className="albedo-ws-drop-item" disabled={!selected} onClick={() => void trashSelected()}>
                Delete…
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {foldersOpen ? (
        <ul className="albedo-tree">
          {nodes.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                className={`albedo-tree-item${selected === node.id ? ' is-selected' : ''}`}
                onClick={() => setSelected(node.id)}
              >
                <i className={`bi ${node.kind === 'folder' ? 'bi-folder' : 'bi-file-earmark'}`} />
                {node.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="albedo-sidebar-resizer" onMouseDown={onDrag} />
      <Modal open={pickerOpen} title="Add folders" onClose={() => setPickerOpen(false)}>
        <HomeTree
          selected={picked}
          workspaceId={active.id}
          onToggle={(rel) => void toggleLive(rel)}
          onTrashed={() => void reload()}
        />
        <button type="button" className="btn btn-sm btn-albedo-primary mt-2" onClick={() => setPickerOpen(false)}>
          Done
        </button>
      </Modal>
    </aside>
  );
}

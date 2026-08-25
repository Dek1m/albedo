import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { useClickOutside } from '../../shared/ui/useClickOutside';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';

interface WorkspaceMenuProps {
  onOpenList: () => void;
  onOpenSessions: () => void;
}

export function WorkspaceMenu({ onOpenList, onOpenSessions }: WorkspaceMenuProps): ReactElement {
  const [hover, setHover] = useState(false);
  const hide = useRef<number>(0);
  const root = useRef<HTMLDivElement>(null);
  const active = useWorkspaceStore((s) => s.active);
  const closeDashboard = useWorkspaceStore((s) => s.closeDashboard);
  const close = useCallback(() => setHover(false), []);

  useEffect(() => () => window.clearTimeout(hide.current), []);
  useClickOutside(hover, root, close);

  const enter = (): void => {
    window.clearTimeout(hide.current);
    setHover(true);
  };
  const leave = (): void => {
    hide.current = window.setTimeout(() => setHover(false), 180);
  };

  return (
    <div className="albedo-ws-menu" ref={root} onMouseEnter={enter} onMouseLeave={leave}>
      <button type="button" className="albedo-ws-menu-btn" onClick={onOpenList}>
        Workspace
      </button>
      {hover ? (
        <div className="albedo-ws-drop">
          <button
            type="button"
            className="albedo-ws-drop-item"
            disabled={!active}
            onClick={() => {
              setHover(false);
              onOpenSessions();
            }}
          >
            Sessions
          </button>
          <button
            type="button"
            className="albedo-ws-drop-item"
            disabled={!active}
            onClick={() => {
              closeDashboard();
              setHover(false);
              toast('Workspace closed', 'info');
            }}
          >
            Close workspace
          </button>
          <button
            type="button"
            className="albedo-ws-drop-item"
            onClick={() => {
              setHover(false);
              onOpenList();
            }}
          >
            All workspaces…
          </button>
        </div>
      ) : null}
    </div>
  );
}

export async function loadCatalog(): Promise<void> {
  const setCatalog = useWorkspaceStore.getState().setCatalog;
  try {
    setCatalog(await workspaceApi.list());
  } catch (err) {
    toast(humanMessage(err));
  }
}

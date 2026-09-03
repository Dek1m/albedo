import { useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import { modopsApi } from '../../api/modopsApi';
import type { SystemModule } from '../../api/modopsApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { ContextMenu } from '../../shared/ui/ContextMenu';
import type { MenuItem } from '../../shared/ui/ContextMenu';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { Window } from '../../shared/ui/Window';
import { ModuleMenu } from './context/ModuleMenu';

interface ModulesWindowProps {
  open: boolean;
  onClose: () => void;
}

interface Ctx {
  x: number;
  y: number;
  items: MenuItem[];
}

function moduleBall(mod: SystemModule): string {
  if (mod.status === 'failed') {
    return 'var(--danger)';
  }
  if (mod.health === 'degraded') {
    return '#f0b232';
  }
  if (mod.status === 'loaded' && mod.health === 'ok') {
    return 'var(--success)';
  }
  return 'var(--text-muted)';
}

export function ModulesWindow({ open, onClose }: ModulesWindowProps): ReactElement {
  const [items, setItems] = useState<SystemModule[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [installOpen, setInstallOpen] = useState(false);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [pending, setPending] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    if (!open) {
      setInstallOpen(false);
      setCtx(null);
      setPending(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);
    void modopsApi
      .list()
      .then((list) => {
        if (!cancelled) {
          setItems(list);
          setSelected(list[0]?.name ?? null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast(humanMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const run = async (work: () => Promise<void>): Promise<void> => {
    try {
      await work();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const refresh = async (): Promise<void> => {
    const list = await modopsApi.list();
    setItems(list);
  };

  const menu = new ModuleMenu({
    onReload: (mod) => {
      void (async () => {
        try {
          await modopsApi.reload(mod.name);
          toast('Reloaded', 'ok');
          await refresh();
        } catch (err) {
          toast(humanMessage(err));
        }
      })();
    },
    onCheckUpdate: (mod) => {
      void (async () => {
        try {
          const result = await modopsApi.checkUpdate(mod.name);
          if (!result.updateAvailable) {
            toast('Already up to date', 'info');
            return;
          }
          setPending((prev) => new Map(prev).set(mod.name, result.remoteLabel));
        } catch (err) {
          toast(humanMessage(err));
        }
      })();
    },
    onUpdate: (mod) => {
      void (async () => {
        try {
          const result = await modopsApi.update(mod.name);
          setPending((prev) => {
            const next = new Map(prev);
            next.delete(mod.name);
            return next;
          });
          if (result.version) {
            setItems((prev) =>
              prev.map((item) => (item.name === mod.name ? { ...item, version: result.version } : item)),
            );
          }
          toast('Updated', 'ok');
        } catch (err) {
          toast(humanMessage(err));
        }
      })();
    },
    onUnload: (mod) => void run(() => modopsApi.unload(mod.name)),
    onDisable: (mod) => void run(() => modopsApi.disable(mod.name)),
    onEnable: (mod) => void run(() => modopsApi.enable(mod.name)),
    onDelete: (mod) => void run(() => modopsApi.delete(mod.name)),
  });

  const openMenu = (event: ReactMouseEvent, mod: SystemModule): void => {
    event.preventDefault();
    event.stopPropagation();
    setCtx({ x: event.clientX, y: event.clientY, items: menu.items(mod, pending.get(mod.name)) });
  };

  return (
    <>
      <Window className="albedo-admin" windowId="albedo-system-modules" open={open} title="Modules" onClose={onClose}>
        {loading && !items.length ? (
          <SkeletonList rows={6} />
        ) : (
          <div className="albedo-admin-roles">
            {items.length ? (
              <ul className="list-group albedo-admin-listbox">
                {items.map((mod) => (
                  <li
                    key={mod.name}
                    className={`list-group-item albedo-session-row${selected === mod.name ? ' active' : ''}`}
                    onClick={() => setSelected(mod.name)}
                  >
                    <span className="albedo-session-ball" style={{ background: moduleBall(mod) }} />
                    <span className="albedo-module-name">{mod.displayName || mod.name}</span>
                    <span className="albedo-module-meta">
                      {mod.version ? <span>{mod.version}</span> : null}
                      {mod.status ? <span className="albedo-badge">{mod.status}</span> : null}
                    </span>
                    <button
                      type="button"
                      className="albedo-module-chevron"
                      aria-label="Module actions"
                      onClick={(event) => openMenu(event, mod)}
                    >
                      <i className="bi bi-chevron-right" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="albedo-ai-muted">No modules</p>
            )}
            <div className="albedo-list-create">
              <button type="button" className="btn btn-sm btn-albedo-primary" onClick={() => setInstallOpen(true)}>
                Install
              </button>
            </div>
          </div>
        )}
      </Window>
      {ctx ? <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={() => setCtx(null)} /> : null}
      <Window
        className="albedo-admin"
        windowId="albedo-system-install"
        open={installOpen}
        title="Install"
        onClose={() => setInstallOpen(false)}
      >
        <SkeletonList rows={6} />
      </Window>
    </>
  );
}

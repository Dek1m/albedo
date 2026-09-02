import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { systemApi } from '../../api/systemApi';
import type { SystemModule } from '../../api/systemApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { Window } from '../../shared/ui/Window';

interface ModulesWindowProps {
  open: boolean;
  onClose: () => void;
}

export function ModulesWindow({ open, onClose }: ModulesWindowProps): ReactElement {
  const [items, setItems] = useState<SystemModule[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setInstallOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void systemApi
      .modulesList()
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

  return (
    <>
      <Window className="albedo-admin" windowId="albedo-system-modules" open={open} title="Modules" onClose={onClose}>
        {loading && !items.length ? (
          <SkeletonList rows={6} />
        ) : (
          <div className="albedo-admin-roles">
            <ul className="list-group albedo-admin-listbox">
              {items.map((mod) => (
                <li
                  key={mod.name}
                  className={`list-group-item albedo-session-row${selected === mod.name ? ' active' : ''}`}
                  onClick={() => setSelected(mod.name)}
                >
                  <span className="albedo-session-ball" style={{ background: 'var(--text-muted)' }} />
                  <span>{mod.name}</span>
                </li>
              ))}
            </ul>
            {!items.length ? <p className="albedo-ai-muted">No modules</p> : null}
            <div className="albedo-list-create">
              <button type="button" className="btn btn-sm btn-albedo-primary" onClick={() => setInstallOpen(true)}>
                Install
              </button>
            </div>
          </div>
        )}
      </Window>
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

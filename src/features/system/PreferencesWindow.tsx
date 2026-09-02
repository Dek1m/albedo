import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { systemApi } from '../../api/systemApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { Window } from '../../shared/ui/Window';

interface PreferencesWindowProps {
  open: boolean;
  onClose: () => void;
}

export function PreferencesWindow({ open, onClose }: PreferencesWindowProps): ReactElement {
  const [keys, setKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void systemApi
      .prefList()
      .then((list) => {
        if (!cancelled) {
          setKeys(list);
          setSelected(list[0] ?? null);
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
    <Window className="albedo-admin" windowId="albedo-system-prefs" open={open} title="Preferences" onClose={onClose}>
      {loading && !keys.length ? (
        <SkeletonList rows={6} />
      ) : (
        <div className="albedo-admin-roles">
          <ul className="list-group albedo-admin-listbox">
            {keys.map((key) => (
              <li
                key={key}
                className={`list-group-item${selected === key ? ' active' : ''}`}
                onClick={() => setSelected(key)}
              >
                <span>{key}</span>
              </li>
            ))}
          </ul>
          {!keys.length ? <p className="albedo-ai-muted">No preferences yet</p> : null}
        </div>
      )}
    </Window>
  );
}

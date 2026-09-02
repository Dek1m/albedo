import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { fsApi } from '../../api/fsApi';
import type { ShareGrantee, ShareLevel } from '../../api/fsApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { SafeName } from '../../shared/ui/SafeName';
import { Window } from '../../shared/ui/Window';
import { ShareAddDialog } from './ShareAddDialog';
import { isEveryoneGrant } from './shareable';
import { useShareStore } from './shareStore';

function levelLabel(level: ShareLevel): string {
  return level === 'editor' ? 'редактирование' : 'чтение';
}

function rowIcon(row: ShareGrantee): string {
  if (!row.active && row.type === 'user') {
    return 'bi-person-x';
  }
  if (isEveryoneGrant(row.name, row.type)) {
    return 'bi-globe2';
  }
  return row.type === 'group' ? 'bi-people-fill' : 'bi-person';
}

export function ShareDialog(): ReactElement | null {
  const path = useShareStore((state) => state.path);
  const close = useShareStore((state) => state.close);
  const [rows, setRows] = useState<ShareGrantee[]>([]);
  const [adding, setAdding] = useState(false);
  const open = Boolean(path);

  const reload = async (rel: string): Promise<void> => {
    try {
      setRows(await fsApi.shareList(rel));
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  useEffect(() => {
    if (!path) {
      return;
    }
    let cancelled = false;
    void fsApi
      .shareList(path)
      .then((items) => {
        if (!cancelled) {
          setRows(items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast(humanMessage(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path) {
    return null;
  }

  const onLevel = async (row: ShareGrantee, level: ShareLevel): Promise<void> => {
    if (level === row.level) {
      return;
    }
    try {
      await fsApi.shareRemove(path, row.type, row.id);
      await fsApi.shareAdd(path, [{ type: row.type, id: row.id }], level);
      await reload(path);
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const onRemove = async (row: ShareGrantee): Promise<void> => {
    try {
      await fsApi.shareRemove(path, row.type, row.id);
      await reload(path);
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <>
      <Window
        open={open}
        title="Share"
        windowId="albedo-share"
        icon="bi-share"
        onClose={close}
      >
        <div className="albedo-share">
          <p className="albedo-share-path">
            <SafeName value={path} />
          </p>
          <div className="albedo-share-table-wrap">
            <table className="table table-sm table-hover">
              <thead>
                <tr>
                  <th />
                  <th>UUID</th>
                  <th>Name</th>
                  <th>Level</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-secondary text-center">
                      Empty
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={`${row.type}:${row.id}`}>
                      <td className="albedo-share-icon">
                        <i
                          className={`bi ${rowIcon(row)}`}
                          title={!row.active ? 'Пользователь отключён' : undefined}
                        />
                      </td>
                      <td className="albedo-dir-uuid">{row.id}</td>
                      <td>
                        <SafeName value={row.name} />
                        {isEveryoneGrant(row.name, row.type) ? (
                          <span className="albedo-share-everyone">Everyone</span>
                        ) : null}
                        {!row.active ? (
                          <span className="albedo-share-off" title="Пользователь отключён">
                            disabled
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={row.level}
                          aria-label={levelLabel(row.level)}
                          onChange={(event) =>
                            void onLevel(row, event.target.value === 'editor' ? 'editor' : 'viewer')
                          }
                        >
                          <option value="viewer">чтение</option>
                          <option value="editor">редактирование</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="albedo-icon-btn"
                          title="Remove"
                          onClick={() => void onRemove(row)}
                        >
                          <i className="bi bi-x" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="albedo-share-foot">
            <button type="button" className="btn btn-sm btn-albedo-primary" onClick={() => setAdding(true)}>
              Add
            </button>
          </div>
        </div>
      </Window>
      <ShareAddDialog
        open={adding}
        path={path}
        onClose={() => setAdding(false)}
        onAdded={() => void reload(path)}
      />
    </>
  );
}

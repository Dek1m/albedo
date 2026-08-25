import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import type { HomeEntry } from '../../domain/workspace';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';

interface HomeTreeProps {
  selected: Set<string>;
  onToggle: (relPath: string) => void;
  workspaceId?: string;
  onTrashed?: () => void;
}

export function HomeTree({ selected, onToggle, workspaceId, onTrashed }: HomeTreeProps): ReactElement {
  const [root, setRoot] = useState<HomeEntry[]>([]);
  const [tick, setTick] = useState(0);

  const reload = useCallback(async (): Promise<void> => {
    setRoot(await workspaceApi.listHome('', workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    void workspaceApi
      .ensureHome()
      .then(() => reload())
      .catch((err: unknown) => toast(humanMessage(err)));
  }, [reload, tick]);

  const trash = async (relPath: string): Promise<void> => {
    if (!workspaceId) {
      return;
    }
    if (!window.confirm(`Удалить «${relPath}» на сервере?`)) {
      return;
    }
    try {
      await workspaceApi.trashHome(workspaceId, relPath);
      setTick((value) => value + 1);
      onTrashed?.();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <div>
      <p className="albedo-home-root">~/</p>
      <HomeBranch
        items={root}
        selected={selected}
        onToggle={onToggle}
        workspaceId={workspaceId}
        onTrash={workspaceId ? trash : undefined}
      />
      <p className="albedo-home-hint">Галочка — в проекте. Корзина — удалить файлы на сервере.</p>
    </div>
  );
}

interface BranchProps {
  items: HomeEntry[];
  selected: Set<string>;
  onToggle: (relPath: string) => void;
  workspaceId?: string;
  onTrash?: (relPath: string) => void;
}

function HomeBranch({ items, selected, onToggle, workspaceId, onTrash }: BranchProps): ReactElement {
  return (
    <ul className="albedo-home-tree">
      {items.map((item) => (
        <HomeNode
          key={item.relPath}
          item={item}
          selected={selected}
          onToggle={onToggle}
          workspaceId={workspaceId}
          onTrash={onTrash}
        />
      ))}
    </ul>
  );
}

interface NodeProps {
  item: HomeEntry;
  selected: Set<string>;
  onToggle: (relPath: string) => void;
  workspaceId?: string;
  onTrash?: (relPath: string) => void;
}

function HomeNode({ item, selected, onToggle, workspaceId, onTrash }: NodeProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [kids, setKids] = useState<HomeEntry[] | null>(null);

  const expand = async (): Promise<void> => {
    if (item.kind !== 'folder') {
      return;
    }
    if (!open && kids === null) {
      try {
        setKids(await workspaceApi.listHome(item.relPath, workspaceId));
      } catch (err) {
        toast(humanMessage(err));
        return;
      }
    }
    setOpen((value) => !value);
  };

  return (
    <li>
      <div className="albedo-home-row">
        {item.kind === 'folder' ? (
          <button type="button" className="albedo-home-toggle" onClick={() => void expand()}>
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="albedo-home-leaf" />
        )}
        <label className="albedo-home-label">
          <input
            type="checkbox"
            checked={selected.has(item.relPath) || item.linked}
            onChange={() => onToggle(item.relPath)}
          />
          <i className={`bi ${item.kind === 'folder' ? 'bi-folder' : 'bi-file-earmark'}`} />
          {item.name}
        </label>
        {onTrash ? (
          <button
            type="button"
            className="albedo-icon-btn"
            title="Delete to trash"
            onClick={() => onTrash(item.relPath)}
          >
            <i className="bi bi-trash" />
          </button>
        ) : null}
      </div>
      {open && kids ? (
        <HomeBranch
          items={kids}
          selected={selected}
          onToggle={onToggle}
          workspaceId={workspaceId}
          onTrash={onTrash}
        />
      ) : null}
    </li>
  );
}

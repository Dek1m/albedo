import { useCallback, useEffect, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import type { HomeEntry } from '../../domain/workspace';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { FileGlyph } from '../../shared/ui/FileGlyph';
import { folderToast, newSegments, pathTail } from './folderToast';

interface HomeTreeProps {
  selected: Set<string>;
  onToggle: (relPath: string) => void;
  workspaceId?: string;
  onTrashed?: () => void;
}

interface Draft {
  kind: 'folder' | 'file';
  parentRel: string;
}

function parseAddress(raw: string): string {
  let value = raw.trim();
  if (value === '~' || value === '~/') {
    return '';
  }
  if (value.startsWith('~/')) {
    value = value.slice(2);
  }
  value = value.replace(/^\/+/, '').replace(/\/+$/, '');
  if (value.includes('..')) {
    throw new Error('invalid path');
  }
  return value;
}

function nestedInside(rel: string, linked: Set<string>): string | null {
  for (const parent of linked) {
    if (rel !== parent && rel.startsWith(`${parent}/`)) {
      return parent;
    }
  }
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function HomeTree({ selected, onToggle, workspaceId, onTrashed }: HomeTreeProps): ReactElement {
  const [root, setRoot] = useState<HomeEntry[]>([]);
  const [tick, setTick] = useState(0);
  const [focusRel, setFocusRel] = useState('');
  const [focusKind, setFocusKind] = useState<'folder' | 'file'>('folder');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [address, setAddress] = useState('~/');
  const [hidden, setHidden] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [alsoDisk, setAlsoDisk] = useState<Set<string>>(() => new Set());
  const [ask, setAsk] = useState<{ rel: string; body: string; detach: boolean } | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setRoot(await workspaceApi.listHome('', workspaceId, { hidden, size: showSize }));
  }, [workspaceId, hidden, showSize]);

  useEffect(() => {
    void workspaceApi
      .ensureHome()
      .then(() => reload())
      .catch((err: unknown) => toast(humanMessage(err)));
  }, [reload, tick]);

  useEffect(() => {
    setAddress(focusRel ? `~/${focusRel}` : '~/');
  }, [focusRel]);

  const parentOfFocus = (): string => {
    if (!focusRel) {
      return '';
    }
    if (focusKind === 'folder') {
      return focusRel;
    }
    const cut = focusRel.lastIndexOf('/');
    return cut === -1 ? '' : focusRel.slice(0, cut);
  };

  const applyAddress = (): string => {
    const rel = parseAddress(address);
    setFocusRel(rel);
    setFocusKind('folder');
    setAddress(rel ? `~/${rel}` : '~/');
    return rel;
  };

  const startCreate = (kind: 'folder' | 'file'): void => {
    setDraft({ kind, parentRel: parentOfFocus() });
  };

  const submitDraft = async (name: string): Promise<void> => {
    if (!draft || !name.trim()) {
      setDraft(null);
      return;
    }
    try {
      await workspaceApi.createHome(name.trim(), draft.parentRel, draft.kind);
      setDraft(null);
      setTick((value) => value + 1);
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const addCurrent = async (): Promise<void> => {
    let rel: string;
    try {
      rel = applyAddress();
    } catch {
      toast('Некорректный путь');
      return;
    }
    if (!rel) {
      toast('Выбери папку или файл');
      return;
    }
    const created = newSegments(rel, selected);
    try {
      await workspaceApi.createHome(rel, '', 'folder');
      setTick((value) => value + 1);
    } catch (err) {
      toast(humanMessage(err));
      return;
    }
    if (nestedInside(rel, selected) || selected.has(rel)) {
      if (created.length) {
        folderToast('created', created);
      }
      return;
    }
    onToggle(rel);
    folderToast('added', created.length > 1 ? created : [pathTail(rel)]);
  };

  const refresh = async (): Promise<void> => {
    try {
      await workspaceApi.refreshHome(workspaceId);
      setTick((value) => value + 1);
      onTrashed?.();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const runTrash = async (relPath: string): Promise<void> => {
    try {
      await workspaceApi.trashHome(relPath, workspaceId);
      folderToast('deleted', [pathTail(relPath)]);
      setTick((value) => value + 1);
      onTrashed?.();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const trash = async (relPath: string): Promise<void> => {
    try {
      const stat = await workspaceApi.homeStat(relPath);
      if (stat.kind === 'folder' && stat.childCount > 0) {
        setAsk({
          rel: relPath,
          body: `В «${relPath}» есть файлы и папки. Удалить всё с диска?`,
          detach: false,
        });
        return;
      }
      setAsk({ rel: relPath, body: `Удалить «${relPath}» с диска?`, detach: false });
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const onAddrKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      try {
        applyAddress();
      } catch {
        toast('Некорректный путь');
      }
    }
  };

  return (
    <div
      className="albedo-home-pane"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('.albedo-home-row, .albedo-home-toolbar, .albedo-home-attached')) {
          return;
        }
        setFocusRel('');
        setFocusKind('folder');
      }}
    >
      <div className="albedo-home-toolbar">
        <input
          className="albedo-home-address"
          value={address}
          spellCheck={false}
          onChange={(event) => setAddress(event.target.value)}
          onKeyDown={onAddrKey}
          aria-label="Path"
        />
        <button type="button" className="albedo-icon-btn" title="Add to workspace" onClick={() => void addCurrent()}>
          <i className="bi bi-plus-lg" />
        </button>
        <button type="button" className="albedo-icon-btn" title="Refresh" onClick={() => void refresh()}>
          <i className="bi bi-arrow-clockwise" />
        </button>
        <button type="button" className="albedo-icon-btn" title="New folder" onClick={() => startCreate('folder')}>
          <i className="bi bi-folder-plus" />
        </button>
        <button type="button" className="albedo-icon-btn" title="New file" onClick={() => startCreate('file')}>
          <i className="bi bi-file-earmark-plus" />
        </button>
        <button
          type="button"
          className={`albedo-icon-btn${hidden ? ' is-on' : ''}`}
          title="Show hidden"
          onClick={() => setHidden((value) => !value)}
        >
          <i className={`bi ${hidden ? 'bi-eye' : 'bi-eye-slash'}`} />
        </button>
        <button
          type="button"
          className={`albedo-icon-btn${showSize ? ' is-on' : ''}`}
          title="Show size"
          onClick={() => setShowSize((value) => !value)}
        >
          <i className="bi bi-hdd" />
        </button>
      </div>
      <HomeBranch
        items={root}
        selected={selected}
        onToggle={onToggle}
        workspaceId={workspaceId}
        onTrash={trash}
        focusRel={focusRel}
        onFocus={(rel, kind) => {
          setFocusRel(rel);
          setFocusKind(kind);
        }}
        draft={draft}
        onSubmitDraft={(name) => void submitDraft(name)}
        onCancelDraft={() => setDraft(null)}
        tick={tick}
        hidden={hidden}
        showSize={showSize}
        onMoved={() => setTick((value) => value + 1)}
      />
      {selected.size ? (
        <ul className="albedo-home-attached">
          {[...selected].sort().map((rel) => (
            <li key={rel}>
              <span>~/{rel}</span>
              <label className="albedo-home-disk" title="Also delete from disk">
                <input
                  type="checkbox"
                  checked={alsoDisk.has(rel)}
                  onChange={() => {
                    setAlsoDisk((prev) => {
                      const next = new Set(prev);
                      if (next.has(rel)) {
                        next.delete(rel);
                      } else {
                        next.add(rel);
                      }
                      return next;
                    });
                  }}
                />
                disk
              </label>
              <button
                type="button"
                className="albedo-icon-btn"
                title="Remove from workspace"
                onClick={() => {
                  void (async () => {
                    if (alsoDisk.has(rel)) {
                      try {
                        const stat = await workspaceApi.homeStat(rel);
                        const body =
                          stat.kind === 'folder' && stat.childCount > 0
                            ? `В «${rel}» есть файлы и папки. Удалить всё с диска?`
                            : `Удалить «${rel}» с диска?`;
                        setAsk({ rel, body, detach: true });
                      } catch (err) {
                        toast(humanMessage(err));
                      }
                      return;
                    }
                    onToggle(rel);
                    folderToast('removed', [pathTail(rel)]);
                  })();
                }}
              >
                <i className="bi bi-x" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ConfirmDialog
        open={Boolean(ask)}
        title="Удалить"
        body={ask?.body ?? ''}
        confirmLabel="Delete"
        danger
        onClose={() => setAsk(null)}
        onConfirm={() => {
          if (!ask) {
            return;
          }
          const rel = ask.rel;
          const detach = ask.detach;
          void runTrash(rel).then(() => {
            if (detach) {
              onToggle(rel);
            }
          });
        }}
      />
    </div>
  );
}

interface BranchProps {
  items: HomeEntry[];
  selected: Set<string>;
  onToggle: (relPath: string) => void;
  workspaceId?: string;
  onTrash: (relPath: string) => void;
  focusRel: string;
  onFocus: (relPath: string, kind: 'folder' | 'file') => void;
  draft: Draft | null;
  onSubmitDraft: (name: string) => void;
  onCancelDraft: () => void;
  tick: number;
  hidden: boolean;
  showSize: boolean;
  onMoved: () => void;
  parentRel?: string;
}

function HomeBranch({
  items,
  selected,
  onToggle,
  workspaceId,
  onTrash,
  focusRel,
  onFocus,
  draft,
  onSubmitDraft,
  onCancelDraft,
  tick,
  hidden,
  showSize,
  onMoved,
  parentRel = '',
}: BranchProps): ReactElement {
  const showDraft = draft && draft.parentRel === parentRel;
  return (
    <ul className="albedo-home-tree">
      {showDraft ? <DraftRow kind={draft.kind} onSubmit={onSubmitDraft} onCancel={onCancelDraft} /> : null}
      {items.map((item) => (
        <HomeNode
          key={item.relPath}
          item={item}
          selected={selected}
          onToggle={onToggle}
          workspaceId={workspaceId}
          onTrash={onTrash}
          focusRel={focusRel}
          onFocus={onFocus}
          draft={draft}
          onSubmitDraft={onSubmitDraft}
          onCancelDraft={onCancelDraft}
          tick={tick}
          hidden={hidden}
          showSize={showSize}
          onMoved={onMoved}
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
  onTrash: (relPath: string) => void;
  focusRel: string;
  onFocus: (relPath: string, kind: 'folder' | 'file') => void;
  draft: Draft | null;
  onSubmitDraft: (name: string) => void;
  onCancelDraft: () => void;
  tick: number;
  hidden: boolean;
  showSize: boolean;
  onMoved: () => void;
}

function HomeNode({
  item,
  selected,
  onToggle,
  workspaceId,
  onTrash,
  focusRel,
  onFocus,
  draft,
  onSubmitDraft,
  onCancelDraft,
  tick,
  hidden,
  showSize,
  onMoved,
}: NodeProps): ReactElement {
  const wantOpen = Boolean(draft && (draft.parentRel === item.relPath || draft.parentRel.startsWith(`${item.relPath}/`)));
  const [open, setOpen] = useState(wantOpen);
  const [kids, setKids] = useState<HomeEntry[] | null>(null);

  useEffect(() => {
    if (wantOpen && !open) {
      setOpen(true);
    }
  }, [wantOpen, open]);

  useEffect(() => {
    if (!open || item.kind !== 'folder') {
      return;
    }
    void workspaceApi
      .listHome(item.relPath, workspaceId, { hidden, size: showSize })
      .then(setKids)
      .catch((err: unknown) => toast(humanMessage(err)));
  }, [open, item.kind, item.relPath, workspaceId, tick, hidden, showSize]);

  const focused = focusRel === item.relPath;
  const cover = item.excluded
    ? ' is-excluded'
    : item.inherited
      ? ' is-inherited'
      : item.linked || selected.has(item.relPath)
        ? ' is-linked'
        : '';

  return (
    <li>
      <div
        className={`albedo-home-row${focused ? ' is-focus' : ''}${cover}`}
        draggable
        onClick={() => onFocus(item.relPath, item.kind)}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/albedo-rel', item.relPath);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(event) => {
          if (item.kind !== 'folder') {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const src = event.dataTransfer.getData('text/albedo-rel');
          if (!src || src === item.relPath || item.kind !== 'folder') {
            return;
          }
          void workspaceApi
            .moveHome(src, item.relPath, workspaceId)
            .then(onMoved)
            .catch((err: unknown) => toast(humanMessage(err)));
        }}
      >
        {item.kind === 'folder' ? (
          <button
            type="button"
            className="albedo-home-toggle"
            onClick={(event) => {
              event.stopPropagation();
              setOpen((value) => !value);
            }}
          >
            <i className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
          </button>
        ) : (
          <span className="albedo-home-leaf" />
        )}
        <FileGlyph name={item.name} kind={item.kind} open={open} />
        <span className="albedo-home-name">{item.name}</span>
        {showSize ? <span className="albedo-home-size">{formatSize(item.sizeBytes)}</span> : null}
        <button
          type="button"
          className="albedo-home-ghost"
          title="Delete"
          onClick={(event) => {
            event.stopPropagation();
            onTrash(item.relPath);
          }}
        >
          <i className="bi bi-trash" />
        </button>
      </div>
      {open && item.kind === 'folder' ? (
        <HomeBranch
          items={kids ?? []}
          selected={selected}
          onToggle={onToggle}
          workspaceId={workspaceId}
          onTrash={onTrash}
          focusRel={focusRel}
          onFocus={onFocus}
          draft={draft}
          onSubmitDraft={onSubmitDraft}
          onCancelDraft={onCancelDraft}
          tick={tick}
          hidden={hidden}
          showSize={showSize}
          onMoved={onMoved}
          parentRel={item.relPath}
        />
      ) : null}
    </li>
  );
}

interface DraftProps {
  kind: 'folder' | 'file';
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

function DraftRow({ kind, onSubmit, onCancel }: DraftProps): ReactElement {
  const [name, setName] = useState('');
  const onKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      onSubmit(name);
    }
    if (event.key === 'Escape') {
      onCancel();
    }
  };
  return (
    <li>
      <div className="albedo-home-row is-draft">
        <span className="albedo-home-leaf" />
        <i className={`bi ${kind === 'folder' ? 'bi-folder' : 'bi-file-earmark'}`} />
        <input
          className="albedo-home-draft"
          autoFocus
          value={name}
          placeholder={kind === 'folder' ? 'folder name' : 'file name'}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={onKey}
          onBlur={() => (name.trim() ? onSubmit(name) : onCancel())}
        />
      </div>
    </li>
  );
}

import { useCallback, useEffect, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
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

interface Draft {
  kind: 'folder' | 'file';
  parentRel: string;
}

export function HomeTree({ selected, onToggle, workspaceId, onTrashed }: HomeTreeProps): ReactElement {
  const [root, setRoot] = useState<HomeEntry[]>([]);
  const [tick, setTick] = useState(0);
  const [focusRel, setFocusRel] = useState('');
  const [focusKind, setFocusKind] = useState<'folder' | 'file'>('folder');
  const [draft, setDraft] = useState<Draft | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setRoot(await workspaceApi.listHome('', workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    void workspaceApi
      .ensureHome()
      .then(() => reload())
      .catch((err: unknown) => toast(humanMessage(err)));
  }, [reload, tick]);

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

  const trash = async (relPath: string): Promise<void> => {
    if (!window.confirm(`Удалить «${relPath}» на сервере?`)) {
      return;
    }
    try {
      await workspaceApi.trashHome(relPath, workspaceId);
      setTick((value) => value + 1);
      onTrashed?.();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <div className="albedo-home-pane">
      <div className="albedo-home-toolbar">
        <button
          type="button"
          className="albedo-home-crumb"
          onClick={() => {
            setFocusRel('');
            setFocusKind('folder');
          }}
        >
          {focusRel ? `~/${focusRel}` : '~/'}
        </button>
        <div className="albedo-home-tools">
          <button type="button" className="albedo-icon-btn" title="New folder" onClick={() => startCreate('folder')}>
            <i className="bi bi-folder-plus" />
          </button>
          <button type="button" className="albedo-icon-btn" title="New file" onClick={() => startCreate('file')}>
            <i className="bi bi-file-earmark-plus" />
          </button>
          <button type="button" className="albedo-icon-btn" title="Refresh" onClick={() => setTick((value) => value + 1)}>
            <i className="bi bi-arrow-clockwise" />
          </button>
        </div>
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
  parentRel = '',
}: BranchProps): ReactElement {
  const showDraft = draft && draft.parentRel === parentRel;
  return (
    <ul className="albedo-home-tree">
      {showDraft ? (
        <DraftRow kind={draft.kind} onSubmit={onSubmitDraft} onCancel={onCancelDraft} />
      ) : null}
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
      .listHome(item.relPath, workspaceId)
      .then(setKids)
      .catch((err: unknown) => toast(humanMessage(err)));
  }, [open, item.kind, item.relPath, workspaceId, tick]);

  const expand = (): void => {
    if (item.kind !== 'folder') {
      return;
    }
    setOpen((value) => !value);
  };

  const focused = focusRel === item.relPath;
  const inProject = selected.has(item.relPath) || item.linked;

  return (
    <li>
      <div
        className={`albedo-home-row${focused ? ' is-focus' : ''}${inProject ? ' is-linked' : ''}`}
        onClick={() => onFocus(item.relPath, item.kind)}
      >
        {item.kind === 'folder' ? (
          <button
            type="button"
            className="albedo-home-toggle"
            onClick={(event) => {
              event.stopPropagation();
              expand();
            }}
          >
            <i className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
          </button>
        ) : (
          <span className="albedo-home-leaf" />
        )}
        <i className={`bi ${item.kind === 'folder' ? (open ? 'bi-folder2-open' : 'bi-folder') : 'bi-file-earmark'}`} />
        <span className="albedo-home-name">{item.name}</span>
        <button
          type="button"
          className={`albedo-home-pin${inProject ? ' is-on' : ''}`}
          title={inProject ? 'In project' : 'Add to project'}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(item.relPath);
          }}
        >
          <i className={`bi ${inProject ? 'bi-check2-circle' : 'bi-circle'}`} />
        </button>
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

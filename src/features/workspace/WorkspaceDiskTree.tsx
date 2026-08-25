import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import type { HomeEntry } from '../../domain/workspace';
import { toast } from '../../shared/toast/toastStore';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { FileGlyph } from '../../shared/ui/FileGlyph';
import { PromptDialog } from '../../shared/ui/PromptDialog';
import { folderToast, pathTail } from './folderToast';

interface Root {
  name: string;
  relPath: string;
  kind: 'folder' | 'file';
}

interface WorkspaceDiskTreeProps {
  roots: Root[];
  workspaceId: string;
  selectedRel: string | null;
  onSelect: (rel: string, kind: 'folder' | 'file') => void;
  onMoved: () => void;
  rev: number;
}

export function WorkspaceDiskTree({
  roots,
  workspaceId,
  selectedRel,
  onSelect,
  onMoved,
  rev,
}: WorkspaceDiskTreeProps): ReactElement {
  const [prompt, setPrompt] = useState<{ mode: 'folder' | 'file' | 'rename'; rel: string } | null>(null);
  const [ask, setAsk] = useState<{ rel: string; body: string } | null>(null);

  const runCreate = async (name: string): Promise<void> => {
    if (!prompt) {
      return;
    }
    try {
      if (prompt.mode === 'rename') {
        await workspaceApi.renameHome(prompt.rel, name, workspaceId);
      } else {
        await workspaceApi.createHome(name, prompt.rel, prompt.mode === 'folder' ? 'folder' : 'file');
      }
      onMoved();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const runTrash = async (rel: string): Promise<void> => {
    try {
      await workspaceApi.trashHome(rel, workspaceId);
      folderToast('deleted', [pathTail(rel)]);
      onMoved();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <>
      <ul className="albedo-tree">
        {roots.map((root) => (
          <DiskNode
            key={root.relPath}
            item={{
              name: root.name,
              kind: root.kind,
              relPath: root.relPath,
              linked: true,
              inherited: false,
              excluded: false,
              sizeBytes: 0,
            }}
            workspaceId={workspaceId}
            selectedRel={selectedRel}
            onSelect={onSelect}
            onMoved={onMoved}
            rev={rev}
            onNewFolder={(rel) => setPrompt({ mode: 'folder', rel })}
            onNewFile={(rel) => setPrompt({ mode: 'file', rel })}
            onRename={(rel) => setPrompt({ mode: 'rename', rel })}
            onAskTrash={async (rel) => {
              try {
                const stat = await workspaceApi.homeStat(rel);
                const body =
                  stat.kind === 'folder' && stat.childCount > 0
                    ? `В «${rel}» есть файлы и папки. Удалить всё с диска?`
                    : `Удалить «${rel}» с диска?`;
                setAsk({ rel, body });
              } catch (err) {
                toast(humanMessage(err));
              }
            }}
            onExclude={async (rel) => {
              try {
                await workspaceApi.excludeHome(workspaceId, rel);
                folderToast('removed', [pathTail(rel)]);
                onMoved();
              } catch (err) {
                toast(humanMessage(err));
              }
            }}
            onInclude={async (rel) => {
              try {
                await workspaceApi.includeHome(workspaceId, rel);
                folderToast('added', [pathTail(rel)]);
                onMoved();
              } catch (err) {
                toast(humanMessage(err));
              }
            }}
          />
        ))}
      </ul>
      <PromptDialog
        open={Boolean(prompt)}
        title={prompt?.mode === 'rename' ? 'Rename' : prompt?.mode === 'file' ? 'New file' : 'New folder'}
        label="Name"
        onClose={() => setPrompt(null)}
        onSubmit={(name) => void runCreate(name)}
      />
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
    </>
  );
}

interface NodeProps {
  item: HomeEntry;
  workspaceId: string;
  selectedRel: string | null;
  onSelect: (rel: string, kind: 'folder' | 'file') => void;
  onMoved: () => void;
  rev: number;
  onNewFolder: (rel: string) => void;
  onNewFile: (rel: string) => void;
  onRename: (rel: string) => void;
  onAskTrash: (rel: string) => void;
  onExclude: (rel: string) => void;
  onInclude: (rel: string) => void;
}

function DiskNode({
  item,
  workspaceId,
  selectedRel,
  onSelect,
  onMoved,
  rev,
  onNewFolder,
  onNewFile,
  onRename,
  onAskTrash,
  onExclude,
  onInclude,
}: NodeProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [kids, setKids] = useState<HomeEntry[] | null>(null);
  const [over, setOver] = useState(false);
  const lastClick = useRef(0);

  useEffect(() => {
    if (!open || item.kind !== 'folder') {
      return;
    }
    void workspaceApi
      .listHome(item.relPath, workspaceId)
      .then(setKids)
      .catch((err: unknown) => toast(humanMessage(err)));
  }, [open, item.kind, item.relPath, workspaceId, rev]);

  const onNameClick = (): void => {
    const now = Date.now();
    if (selectedRel === item.relPath && now - lastClick.current > 500 && now - lastClick.current < 1800) {
      onRename(item.relPath);
      lastClick.current = now;
      return;
    }
    lastClick.current = now;
    onSelect(item.relPath, item.kind);
  };

  const cover = item.excluded ? 'is-excluded' : item.inherited ? 'is-inherited' : item.linked ? 'is-linked' : '';

  return (
    <li>
      <div
        className={`albedo-tree-item${selectedRel === item.relPath ? ' is-selected' : ''}${over ? ' is-drop' : ''} ${cover}`}
        draggable
        onClick={onNameClick}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/albedo-rel', item.relPath);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(event) => {
          if (item.kind !== 'folder') {
            return;
          }
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
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
          <i
            className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'} albedo-tree-chevron`}
            onClick={(event) => {
              event.stopPropagation();
              setOpen((value) => !value);
            }}
          />
        ) : (
          <span className="albedo-tree-chevron" />
        )}
        <FileGlyph name={item.name} kind={item.kind} open={open} />
        <span className="albedo-tree-name">{item.name}</span>
        <span className="albedo-row-actions">
          {item.kind === 'folder' ? (
            <>
              <button
                type="button"
                className="albedo-icon-btn"
                title="New folder"
                onClick={(event) => {
                  event.stopPropagation();
                  onNewFolder(item.relPath);
                }}
              >
                <i className="bi bi-folder-plus" />
              </button>
              <button
                type="button"
                className="albedo-icon-btn"
                title="New file"
                onClick={(event) => {
                  event.stopPropagation();
                  onNewFile(item.relPath);
                }}
              >
                <i className="bi bi-file-earmark-plus" />
              </button>
            </>
          ) : null}
          {item.inherited ? (
            <button
              type="button"
              className="albedo-icon-btn"
              title="Remove from workspace"
              onClick={(event) => {
                event.stopPropagation();
                onExclude(item.relPath);
              }}
            >
              <i className="bi bi-dash-circle" />
            </button>
          ) : null}
          {item.excluded ? (
            <button
              type="button"
              className="albedo-icon-btn"
              title="Add to workspace"
              onClick={(event) => {
                event.stopPropagation();
                onInclude(item.relPath);
              }}
            >
              <i className="bi bi-plus-circle" />
            </button>
          ) : null}
          {item.linked ? (
            <button
              type="button"
              className="albedo-icon-btn"
              title="Remove from workspace"
              onClick={(event) => {
                event.stopPropagation();
                onExclude(item.relPath);
              }}
            >
              <i className="bi bi-dash-circle" />
            </button>
          ) : null}
          <button
            type="button"
            className="albedo-icon-btn"
            title="Delete from disk"
            onClick={(event) => {
              event.stopPropagation();
              onAskTrash(item.relPath);
            }}
          >
            <i className="bi bi-trash" />
          </button>
        </span>
      </div>
      {open && kids ? (
        <ul className="albedo-tree albedo-tree-nested">
          {kids.map((child) => (
            <DiskNode
              key={child.relPath}
              item={child}
              workspaceId={workspaceId}
              selectedRel={selectedRel}
              onSelect={onSelect}
              onMoved={onMoved}
              rev={rev}
              onNewFolder={onNewFolder}
              onNewFile={onNewFile}
              onRename={onRename}
              onAskTrash={onAskTrash}
              onExclude={onExclude}
              onInclude={onInclude}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

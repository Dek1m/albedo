import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import type { HomeEntry } from '../../domain/workspace';
import { toast } from '../../shared/toast/toastStore';
import { FileGlyph } from '../../shared/ui/FileGlyph';

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
  return (
    <ul className="albedo-tree">
      {roots.map((root) => (
        <DiskNode
          key={root.relPath}
          item={{ name: root.name, kind: root.kind, relPath: root.relPath, linked: true, sizeBytes: 0 }}
          workspaceId={workspaceId}
          selectedRel={selectedRel}
          onSelect={onSelect}
          onMoved={onMoved}
          rev={rev}
        />
      ))}
    </ul>
  );
}

interface NodeProps {
  item: HomeEntry;
  workspaceId: string;
  selectedRel: string | null;
  onSelect: (rel: string, kind: 'folder' | 'file') => void;
  onMoved: () => void;
  rev: number;
}

function DiskNode({ item, workspaceId, selectedRel, onSelect, onMoved, rev }: NodeProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [kids, setKids] = useState<HomeEntry[] | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!open || item.kind !== 'folder') {
      return;
    }
    void workspaceApi
      .listHome(item.relPath, workspaceId)
      .then(setKids)
      .catch((err: unknown) => toast(humanMessage(err)));
  }, [open, item.kind, item.relPath, workspaceId, rev]);

  return (
    <li>
      <button
        type="button"
        className={`albedo-tree-item${selectedRel === item.relPath ? ' is-selected' : ''}${over ? ' is-drop' : ''}`}
        draggable
        onClick={() => onSelect(item.relPath, item.kind)}
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
        {item.name}
      </button>
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
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

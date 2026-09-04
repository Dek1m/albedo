import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ReactElement } from 'react';
import { fsApi } from '../../api/fsApi';
import { humanMessage } from '../../api/errors';
import { log } from '../../shared/log';
import { toast } from '../../shared/toast/toastStore';
import { FileGlyph } from '../../shared/ui/FileGlyph';
import { Window } from '../../shared/ui/Window';
import { bytesLabel, homeDisplay, joinHomeRel } from './addFilePath';

export interface AddFileDialogProps {
  open: boolean;
  parentRel: string;
  onClose: () => void;
  onDone: () => void;
}

interface QueueItem {
  id: string;
  name: string;
  rel: string;
  kind: 'file' | 'folder';
  source: 'create' | 'local';
  size: number;
  file?: File;
}

interface Progress {
  rel: string;
  done: number;
  total: number;
}

function nid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function fileToB64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let raw = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    raw += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(raw);
}

function fileRel(file: File): string {
  const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return (relative && relative !== file.name ? relative : file.name).replace(/^\/+/, '');
}

export function AddFileDialog({ open, parentRel, onClose, onDone }: AddFileDialogProps): ReactElement {
  const [draft, setDraft] = useState('');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [fromOpen, setFromOpen] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft('');
      setItems([]);
      setFromOpen(false);
      setProgress(null);
    }
  }, [open]);

  const pushCreate = (): void => {
    const name = draft.trim().replace(/^\/+|\/+$/g, '');
    if (!name) {
      return;
    }
    try {
      const rel = joinHomeRel(parentRel, name);
      log.info('add_file_queued', { source: 'create', rel, size: 0 });
      setItems((prev) => [...prev, { id: nid(), name, rel, kind: 'file', source: 'create', size: 0 }]);
      setDraft('');
    } catch {
      toast('Invalid path');
    }
  };

  const pushLocal = (list: FileList | File[]): void => {
    const next: QueueItem[] = [];
    for (const file of Array.from(list)) {
      const name = fileRel(file);
      try {
        const rel = joinHomeRel(parentRel, name);
        log.info('add_file_queued', { source: 'local', rel, size: file.size });
        next.push({
          id: nid(),
          name,
          rel,
          kind: 'file',
          source: 'local',
          size: file.size,
          file,
        });
      } catch {
        toast('Invalid path');
      }
    }
    if (next.length) {
      setItems((prev) => [...prev, ...next]);
    }
  };

  const onLocal = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files?.length) {
      pushLocal(event.target.files);
    }
    event.target.value = '';
    setFromOpen(false);
  };

  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    if (event.dataTransfer.files.length) {
      pushLocal(event.dataTransfer.files);
    }
  };

  const run = async (): Promise<void> => {
    if (!items.length) {
      return;
    }
    const dirs = new Set<string>();
    for (const item of items) {
      const cut = item.rel.lastIndexOf('/');
      if (cut > 0) {
        dirs.add(item.rel.slice(0, cut));
      }
    }
    const ordered = [...dirs].sort((a, b) => a.length - b.length);
    const jobs = [
      ...ordered.map((rel) => ({ kind: 'folder' as const, rel })),
      ...items.map((item) => ({ kind: 'file' as const, rel: item.rel, item })),
    ];
    log.info('add_file_start', { count: items.length, parent: parentRel });
    try {
      for (let i = 0; i < jobs.length; i += 1) {
        const job = jobs[i]!;
        setProgress({ rel: job.rel, done: i, total: jobs.length });
        log.info('add_file_upload', { rel: job.rel, path: homeDisplay(job.rel), index: i + 1, total: jobs.length });
        if (job.kind === 'folder') {
          await fsApi.mkdir(job.rel);
          continue;
        }
        const item = job.item!;
        if (item.source === 'create' || !item.file) {
          await fsApi.touch(item.rel);
        } else {
          await fsApi.write(item.rel, await fileToB64(item.file));
        }
      }
      setProgress({ rel: items[items.length - 1]?.rel ?? '', done: jobs.length, total: jobs.length });
      log.info('add_file_done', { count: items.length });
      onDone();
      onClose();
    } catch (err) {
      log.error('add_file_failed', { error: humanMessage(err) });
      toast(humanMessage(err));
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <Window className="albedo-add-file" windowId="albedo-add-file" open={open} title="Add File" onClose={onClose}>
        <div className="albedo-add-file-row">
          <input
            className="form-control form-control-sm"
            autoFocus
            value={draft}
            placeholder="Name"
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                pushCreate();
              }
            }}
          />
          <button type="button" className="albedo-icon-btn" title="Add to list" aria-label="Add to list" onClick={pushCreate}>
            <i className="bi bi-plus-lg" />
          </button>
        </div>
        <ul
          className="albedo-add-file-list"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          {items.map((item) => (
            <li key={item.id} className="albedo-add-file-item">
              <FileGlyph name={item.name} kind={item.kind} />
              <span className="albedo-add-file-name">{item.name}</span>
              <span className="albedo-add-file-src">{item.source === 'local' ? 'from local' : 'Create'}</span>
              <span className="albedo-add-file-size">{bytesLabel(item.size)}</span>
            </li>
          ))}
        </ul>
        <div className="albedo-confirm-actions albedo-add-file-actions">
          <button type="button" className="btn btn-sm btn-albedo-primary" disabled={!items.length || Boolean(progress)} onClick={() => void run()}>
            Add
          </button>
          <div className="albedo-kebab">
            <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={() => setFromOpen((value) => !value)}>
              From Local
            </button>
            {fromOpen ? (
              <div className="albedo-drop is-right" role="menu">
                <button type="button" className="albedo-drop-item" onClick={() => filesRef.current?.click()}>
                  Files
                </button>
                <button type="button" className="albedo-drop-item" onClick={() => dirRef.current?.click()}>
                  Folder
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
        <input ref={filesRef} type="file" multiple hidden onChange={onLocal} />
        <input
          ref={(node) => {
            dirRef.current = node;
            if (node) {
              node.setAttribute('webkitdirectory', 'true');
              node.setAttribute('directory', 'true');
            }
          }}
          type="file"
          multiple
          hidden
          onChange={onLocal}
        />
      </Window>
      <Window
        className="albedo-upload"
        windowId="albedo-upload"
        size="ask"
        open={Boolean(progress)}
        title="Uploading"
        onClose={() => undefined}
      >
        {progress ? (
          <>
            <p className="albedo-upload-path">{homeDisplay(progress.rel)}</p>
            <p className="albedo-upload-name">{progress.rel.slice(progress.rel.lastIndexOf('/') + 1)}</p>
            <div className="albedo-upload-bar" aria-valuenow={progress.done} aria-valuemax={progress.total} role="progressbar">
              <span style={{ width: `${progress.total ? (100 * progress.done) / progress.total : 0}%` }} />
            </div>
          </>
        ) : null}
      </Window>
    </>
  );
}

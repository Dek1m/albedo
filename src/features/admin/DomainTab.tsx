import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { DomainGroup, DomainOu, DomainUser } from '../../api/adminApi';
import { ApiError, humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { ContextMenu } from '../../shared/ui/ContextMenu';
import type { MenuItem } from '../../shared/ui/ContextMenu';
import { PromptDialog } from '../../shared/ui/PromptDialog';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { DomainFolderMenu } from './context/DomainFolderMenu';
import { DomainGroupMenu } from './context/DomainGroupMenu';
import { DomainUserMenu } from './context/DomainUserMenu';
import { DirectoryGroupWindow } from './DirectoryGroupWindow';
import type { DirectoryGroupMode } from './DirectoryGroupWindow';
import { DirectoryUserWindow } from './DirectoryUserWindow';
import type { DirectoryUserMode } from './DirectoryUserWindow';
import { DomainSearch } from './DomainSearch';
import { DomainTable } from './DomainTable';
import { DomainTree } from './DomainTree';
import type { DirectoryRow, DomainFilterField } from './domainRows';
import { visibleRows } from './domainRows';

interface DomainTabProps {
  visible: boolean;
  userAdmin: boolean;
  groupAdmin: boolean;
}

interface Ctx {
  x: number;
  y: number;
  items: MenuItem[];
}

const FORBIDDEN = new ApiError('FORBIDDEN', 'You do not have permission', undefined, 403);

export function DomainTab({ visible, userAdmin, groupAdmin }: DomainTabProps): ReactElement {
  const [tree, setTree] = useState<DomainOu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOuId, setSelectedOuId] = useState<string | null>(null);
  const [field, setField] = useState<DomainFilterField>('any');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [prompt, setPrompt] = useState<{
    title: string;
    label: string;
    confirmLabel: string;
    submit: (value: string) => Promise<void>;
  } | null>(null);
  const [editor, setEditor] = useState<DirectoryUserMode | null>(null);
  const [groupEditor, setGroupEditor] = useState<DirectoryGroupMode | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const data = await adminApi.domainTree();
      setTree(data);
      setSelectedOuId((current) => current ?? data[0]?.id ?? null);
    } catch (err) {
      toast(humanMessage(err));
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void adminApi
      .domainTree()
      .then((data) => {
        if (!cancelled) {
          setTree(data);
          setSelectedOuId((current) => current ?? data[0]?.id ?? null);
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
  }, [visible]);

  const run = async (work: () => Promise<void>): Promise<void> => {
    try {
      await work();
      await load();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const openUser = (userId: string): void => {
    if (!userAdmin) {
      toast(humanMessage(FORBIDDEN));
      return;
    }
    setEditor({ kind: 'edit', userId });
  };

  const folderMenu = new DomainFolderMenu({
    canCreateUser: userAdmin,
    canCreateGroup: groupAdmin,
    onNewFolder: (ou) =>
      setPrompt({
        title: 'New folder',
        label: 'Name',
        confirmLabel: 'Create',
        submit: (name) => run(() => adminApi.createOu(ou.id, name)),
      }),
    onCreateUser: (ou) => setEditor({ kind: 'create', ouId: ou.id }),
    onCreateGroup: (ou) => {
      if (!groupAdmin) {
        toast(humanMessage(FORBIDDEN));
        return;
      }
      setGroupEditor({ kind: 'create', ouId: ou.id });
    },
    onRename: (ou) =>
      setPrompt({
        title: 'Rename',
        label: 'Name',
        confirmLabel: 'Save',
        submit: (name) => run(() => adminApi.renameOu(ou.id, name)),
      }),
  });

  const userMenu = new DomainUserMenu({
    onRename: (user) =>
      setPrompt({
        title: 'Rename',
        label: 'Username',
        confirmLabel: 'Save',
        submit: (name) => run(() => adminApi.renameUser(user.id, name)),
      }),
  });

  const groupMenu = new DomainGroupMenu({
    onRename: (group) =>
      setPrompt({
        title: 'Rename',
        label: 'Name',
        confirmLabel: 'Save',
        submit: (name) => run(() => adminApi.renameGroup(group.id, name)),
      }),
  });

  const openMenu = (event: ReactMouseEvent, items: MenuItem[]): void => {
    event.preventDefault();
    event.stopPropagation();
    setCtx({ x: event.clientX, y: event.clientY, items });
  };

  const rows = useMemo(
    () => visibleRows(tree, selectedOuId, field, query),
    [tree, selectedOuId, field, query],
  );

  const onActivate = (row: DirectoryRow): void => {
    if (row.type === 'ou') {
      setSelectedOuId(row.id);
      return;
    }
    if (row.type === 'user') {
      openUser(row.id);
      return;
    }
    if (row.type === 'group') {
      if (!groupAdmin) {
        toast(humanMessage(FORBIDDEN));
        return;
      }
      setGroupEditor({ kind: 'edit', groupId: row.id, name: row.name });
    }
  };

  const toggle = (key: string): void => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAll = (keys: string[], on: boolean): void => {
    setPicked((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (on) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return next;
    });
  };

  if (loading && !tree.length) {
    return <SkeletonList rows={8} />;
  }

  return (
    <div className="albedo-admin-domain">
      <DomainSearch field={field} query={query} onField={setField} onQuery={setQuery} />
      <div className="albedo-admin-split">
        <div className="albedo-admin-tree">
          <DomainTree
            tree={tree}
            selectedOuId={selectedOuId}
            onSelectOu={(ou) => setSelectedOuId(ou.id)}
            onSelectUser={(user: DomainUser) => openUser(user.id)}
            onFolderMenu={(event, ou) => openMenu(event, folderMenu.items(ou))}
            onUserMenu={(event, user) => openMenu(event, userMenu.items(user))}
            onGroupMenu={(event, group: DomainGroup) => openMenu(event, groupMenu.items(group))}
          />
        </div>
        <div className="albedo-admin-people">
          <DomainTable
            rows={rows}
            selected={picked}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onActivate={onActivate}
          />
        </div>
      </div>
      {ctx ? <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={() => setCtx(null)} /> : null}
      <PromptDialog
        open={Boolean(prompt)}
        title={prompt?.title ?? ''}
        label={prompt?.label}
        confirmLabel={prompt?.confirmLabel}
        onClose={() => setPrompt(null)}
        onSubmit={(value) => {
          if (prompt) {
            void prompt.submit(value);
          }
        }}
      />
      <DirectoryUserWindow mode={editor} onClose={() => setEditor(null)} onSaved={() => void load()} />
      <DirectoryGroupWindow
        mode={groupEditor}
        canEdit={groupAdmin}
        onClose={() => setGroupEditor(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}

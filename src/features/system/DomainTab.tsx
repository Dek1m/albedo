import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import { systemApi } from '../../api/systemApi';
import type { DomainGroup, DomainOu, DomainUser } from '../../api/systemApi';
import { ApiError, humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { ContextMenu } from '../../shared/ui/ContextMenu';
import type { MenuItem } from '../../shared/ui/ContextMenu';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { PromptDialog } from '../../shared/ui/PromptDialog';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { DomainFolderMenu } from './context/DomainFolderMenu';
import { DomainGroupMenu } from './context/DomainGroupMenu';
import { DomainUserMenu } from './context/DomainUserMenu';
import { DirectoryGroupPane } from './DirectoryGroupPane';
import { DirectoryOuPane } from './DirectoryOuPane';
import { DirectoryUserPane } from './DirectoryUserPane';
import { DomainSearch } from './DomainSearch';
import { DomainTable } from './DomainTable';
import { DomainTree } from './DomainTree';
import type { DirectoryRow, DomainFilterField } from './domainRows';
import { visibleRows } from './domainRows';
import type { DomainSelection } from './domainSelection';

interface DomainTabProps {
  visible: boolean;
  userAdmin: boolean;
  groupAdmin: boolean;
  roleAdmin: boolean;
}

interface Ctx {
  x: number;
  y: number;
  items: MenuItem[];
}

const FORBIDDEN = new ApiError('FORBIDDEN', 'You do not have permission', undefined, 403);

function findOu(nodes: DomainOu[], id: string): DomainOu | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const nested = findOu(node.children, id);
    if (nested) {
      return nested;
    }
  }
  return null;
}

export function DomainTab({ visible, userAdmin, groupAdmin, roleAdmin }: DomainTabProps): ReactElement {
  const [tree, setTree] = useState<DomainOu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<DomainSelection | null>(null);
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
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    submit: () => Promise<void>;
  } | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const data = await systemApi.domainTree();
      setTree(data);
      setSelection((current) => current ?? (data[0] ? { type: 'ou', id: data[0].id } : null));
    } catch (err) {
      toast(humanMessage(err));
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void systemApi
      .domainTree()
      .then((data) => {
        if (!cancelled) {
          setTree(data);
          setSelection((current) => current ?? (data[0] ? { type: 'ou', id: data[0].id } : null));
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

  const folderMenu = new DomainFolderMenu({
    canCreateUser: userAdmin,
    canCreateGroup: groupAdmin,
    onNewFolder: (ou) =>
      setPrompt({
        title: 'New folder',
        label: 'Name',
        confirmLabel: 'Create',
        submit: (name) => run(() => systemApi.createOu(ou.id, name)),
      }),
    onCreateUser: (ou) => setSelection({ type: 'create-user', id: ou.id, ouId: ou.id }),
    onCreateGroup: (ou) => {
      if (!groupAdmin) {
        toast(humanMessage(FORBIDDEN));
        return;
      }
      setSelection({ type: 'create-group', id: ou.id, ouId: ou.id });
    },
    onRename: (ou) =>
      setPrompt({
        title: 'Rename',
        label: 'Name',
        confirmLabel: 'Save',
        submit: (name) => run(() => systemApi.renameOu(ou.id, name)),
      }),
    onDelete: (ou) => {
      const empty = !ou.children.length && !ou.users.length && !ou.groups.length;
      if (!empty) {
        toast('Folder is not empty', 'error');
        return;
      }
      void run(() => systemApi.deleteOu(ou.id));
    },
  });

  const userMenu = new DomainUserMenu({
    onRename: (user) =>
      setPrompt({
        title: 'Rename',
        label: 'Username',
        confirmLabel: 'Save',
        submit: (name) => run(() => systemApi.renameUser(user.id, name)),
      }),
    onDelete: (user) =>
      setConfirm({
        title: 'Delete user',
        body: `Delete user ${user.username}? This cannot be undone.`,
        submit: () => run(() => systemApi.deleteUser(user.id)),
      }),
  });

  const groupMenu = new DomainGroupMenu({
    onRename: (group) =>
      setPrompt({
        title: 'Rename',
        label: 'Name',
        confirmLabel: 'Save',
        submit: (name) => run(() => systemApi.renameGroup(group.id, name)),
      }),
    onDelete: (group) =>
      setConfirm({
        title: 'Delete group',
        body: `Delete group ${group.name}? This cannot be undone.`,
        submit: () => run(() => systemApi.deleteGroup(group.id)),
      }),
  });

  const openMenu = (event: ReactMouseEvent, items: MenuItem[]): void => {
    event.preventDefault();
    event.stopPropagation();
    setCtx({ x: event.clientX, y: event.clientY, items });
  };

  const selectedOuId = selection?.type === 'ou' ? selection.id : selection && 'ouId' in selection ? selection.ouId : null;
  const rows = useMemo(
    () => visibleRows(tree, selectedOuId, field, query),
    [tree, selectedOuId, field, query],
  );
  const searching = query.trim().length > 0;

  const onActivate = (row: DirectoryRow): void => {
    setQuery('');
    if (row.type === 'ou') {
      setSelection({ type: 'ou', id: row.id });
      return;
    }
    if (row.type === 'user') {
      setSelection({ type: 'user', id: row.id });
      return;
    }
    setSelection({ type: 'group', id: row.id, name: row.name });
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

  const selectedOu = selection?.type === 'ou' ? findOu(tree, selection.id) : null;

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
            selection={selection}
            onSelectOu={(ou) => setSelection({ type: 'ou', id: ou.id })}
            onSelectUser={(user: DomainUser) => setSelection({ type: 'user', id: user.id })}
            onSelectGroup={(group: DomainGroup) => setSelection({ type: 'group', id: group.id, name: group.name })}
            onFolderMenu={(event, ou) => openMenu(event, folderMenu.items(ou))}
            onUserMenu={(event, user) => openMenu(event, userMenu.items(user))}
            onGroupMenu={(event, group: DomainGroup) => openMenu(event, groupMenu.items(group))}
          />
        </div>
        <div className="albedo-admin-people">
          {searching ? (
            <DomainTable
              rows={rows}
              selected={picked}
              onToggle={toggle}
              onToggleAll={toggleAll}
              onActivate={onActivate}
            />
          ) : null}
          {!searching && selection?.type === 'user' ? (
            <DirectoryUserPane
              mode={{ kind: 'edit', userId: selection.id }}
              canEdit={userAdmin}
              onSaved={() => void load()}
            />
          ) : null}
          {!searching && selection?.type === 'create-user' ? (
            <DirectoryUserPane
              mode={{ kind: 'create', ouId: selection.ouId }}
              canEdit={userAdmin}
              onSaved={(userId) => {
                void (async () => {
                  await load();
                  if (userId) {
                    setSelection({ type: 'user', id: userId });
                  }
                })();
              }}
            />
          ) : null}
          {!searching && selection?.type === 'group' ? (
            <DirectoryGroupPane
              mode={{ kind: 'edit', groupId: selection.id, name: selection.name }}
              canEdit={groupAdmin}
              canEditRoles={roleAdmin}
              onSaved={(groupId, name) => {
                void load();
                if (groupId) {
                  setSelection({ type: 'group', id: groupId, name });
                }
              }}
            />
          ) : null}
          {!searching && selection?.type === 'create-group' ? (
            <DirectoryGroupPane
              mode={{ kind: 'create', ouId: selection.ouId }}
              canEdit={groupAdmin}
              canEditRoles={roleAdmin}
              onSaved={(groupId, name) => {
                void load();
                if (groupId) {
                  setSelection({ type: 'group', id: groupId, name });
                }
              }}
            />
          ) : null}
          {!searching && selection?.type === 'ou' && selectedOu ? (
            <DirectoryOuPane ou={selectedOu} canEdit={userAdmin || groupAdmin} onSaved={() => void load()} />
          ) : null}
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
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ''}
        body={confirm?.body ?? ''}
        confirmLabel="Delete"
        danger
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) {
            void confirm.submit();
          }
        }}
      />
    </div>
  );
}

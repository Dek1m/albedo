import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { DomainGroup, DomainOu, DomainUser } from '../../api/adminApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { ContextMenu } from '../../shared/ui/ContextMenu';
import type { MenuItem } from '../../shared/ui/ContextMenu';
import { PromptDialog } from '../../shared/ui/PromptDialog';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { CreateUserDialog } from './CreateUserDialog';
import { DomainFolderMenu } from './context/DomainFolderMenu';
import { DomainGroupMenu } from './context/DomainGroupMenu';
import { DomainUserMenu } from './context/DomainUserMenu';

interface DomainTabProps {
  visible: boolean;
}

interface UserRow {
  id: string;
  username: string;
  ouPath: string;
  workspaceDb: string;
}

interface Ctx {
  x: number;
  y: number;
  items: MenuItem[];
}

function collectUsers(nodes: DomainOu[], prefix: string[] = []): UserRow[] {
  const rows: UserRow[] = [];
  for (const node of nodes) {
    const path = [...prefix, node.name];
    const ouPath = path.join(' / ');
    for (const user of node.users) {
      rows.push({
        id: user.id,
        username: user.username,
        ouPath,
        workspaceDb: user.workspaceDb,
      });
    }
    rows.push(...collectUsers(node.children, path));
  }
  return rows;
}

function ouIcon(kind: DomainOu['kind']): string {
  if (kind === 'users_bin') {
    return 'bi-people';
  }
  if (kind === 'groups_bin') {
    return 'bi-collection';
  }
  return 'bi-folder';
}

export function DomainTab({ visible }: DomainTabProps): ReactElement {
  const [tree, setTree] = useState<DomainOu[]>([]);
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [prompt, setPrompt] = useState<{
    title: string;
    label: string;
    confirmLabel: string;
    submit: (value: string) => Promise<void>;
  } | null>(null);
  const [createUserOu, setCreateUserOu] = useState<DomainOu | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setTree(await adminApi.domainTree());
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
    onNewFolder: (ou) =>
      setPrompt({
        title: 'New folder',
        label: 'Name',
        confirmLabel: 'Create',
        submit: (name) => run(() => adminApi.createOu(ou.id, name)),
      }),
    onCreateUser: (ou) => setCreateUserOu(ou),
    onCreateGroup: (ou) =>
      setPrompt({
        title: 'Создать группу',
        label: 'Name',
        confirmLabel: 'Create',
        submit: (name) => run(() => adminApi.createGroupInOu(name, ou.id)),
      }),
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

  const users = collectUsers(tree);

  if (loading && !tree.length) {
    return <SkeletonList rows={8} />;
  }

  return (
    <div className="albedo-admin-domain">
      <div className="albedo-admin-split">
        <div className="albedo-admin-tree">
          <ul className="albedo-tree">
            {tree.map((node) => (
              <OuNode
                key={node.id}
                node={node}
                onFolder={(event, ou) => openMenu(event, folderMenu.items(ou))}
                onUser={(event, user) => openMenu(event, userMenu.items(user))}
                onGroup={(event, group) => openMenu(event, groupMenu.items(group))}
              />
            ))}
          </ul>
        </div>
        <div className="albedo-admin-people">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>username</th>
                <th>OU path</th>
                <th>workspace_db</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id}>
                  <td>{row.username}</td>
                  <td>{row.ouPath}</td>
                  <td>{row.workspaceDb}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
      <CreateUserDialog
        open={Boolean(createUserOu)}
        onClose={() => setCreateUserOu(null)}
        onSubmit={({ username, password }) => {
          const ou = createUserOu;
          if (!ou) {
            return;
          }
          void run(() => adminApi.createUserInOu({ username, password, ouId: ou.id }));
        }}
      />
    </div>
  );
}

interface OuNodeProps {
  node: DomainOu;
  onFolder: (event: ReactMouseEvent, ou: DomainOu) => void;
  onUser: (event: ReactMouseEvent, user: DomainUser) => void;
  onGroup: (event: ReactMouseEvent, group: DomainGroup) => void;
}

function OuNode({ node, onFolder, onUser, onGroup }: OuNodeProps): ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <li>
      <div className="albedo-tree-item" onContextMenu={(event) => onFolder(event, node)}>
        <i
          className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'} albedo-tree-chevron`}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
        />
        <i className={`bi ${ouIcon(node.kind)}`} />
        <span className="albedo-tree-name">{node.name}</span>
      </div>
      {open ? (
        <ul className="albedo-tree albedo-tree-nested">
          {node.children.map((child) => (
            <OuNode key={child.id} node={child} onFolder={onFolder} onUser={onUser} onGroup={onGroup} />
          ))}
          {node.users.map((user) => (
            <li key={`u-${user.id}`}>
              <div className="albedo-tree-item" onContextMenu={(event) => onUser(event, user)}>
                <span className="albedo-tree-chevron" />
                <i className="bi bi-person" />
                <span className="albedo-tree-name">{user.username}</span>
              </div>
            </li>
          ))}
          {node.groups.map((group) => (
            <li key={`g-${group.id}`}>
              <div className="albedo-tree-item" onContextMenu={(event) => onGroup(event, group)}>
                <span className="albedo-tree-chevron" />
                <i className="bi bi-people-fill" />
                <span className="albedo-tree-name">{group.name}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

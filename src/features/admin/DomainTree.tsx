import { useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import type { DomainGroup, DomainOu, DomainUser } from '../../api/adminApi';

interface DomainTreeProps {
  tree: DomainOu[];
  selectedOuId: string | null;
  onSelectOu: (ou: DomainOu) => void;
  onSelectUser: (user: DomainUser) => void;
  onFolderMenu: (event: ReactMouseEvent, ou: DomainOu) => void;
  onUserMenu: (event: ReactMouseEvent, user: DomainUser) => void;
  onGroupMenu: (event: ReactMouseEvent, group: DomainGroup) => void;
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

export function DomainTree(props: DomainTreeProps): ReactElement {
  return (
    <ul className="albedo-tree">
      {props.tree.map((node) => (
        <OuNode key={node.id} node={node} {...props} />
      ))}
    </ul>
  );
}

interface OuNodeProps extends DomainTreeProps {
  node: DomainOu;
}

function OuNode({ node, ...rest }: OuNodeProps): ReactElement {
  const [open, setOpen] = useState(true);
  const focused = rest.selectedOuId === node.id;
  return (
    <li>
      <div
        className={`albedo-tree-item${focused ? ' is-focused is-selected active' : ''}`}
        onClick={() => rest.onSelectOu(node)}
        onContextMenu={(event) => rest.onFolderMenu(event, node)}
      >
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
            <OuNode key={child.id} node={child} {...rest} />
          ))}
          {node.users.map((user) => (
            <li key={`u-${user.id}`}>
              <div
                className="albedo-tree-item"
                onClick={() => rest.onSelectUser(user)}
                onContextMenu={(event) => rest.onUserMenu(event, user)}
              >
                <span className="albedo-tree-chevron" />
                <i className="bi bi-person" />
                <span className="albedo-tree-name">{user.username}</span>
              </div>
            </li>
          ))}
          {node.groups.map((group) => (
            <li key={`g-${group.id}`}>
              <div className="albedo-tree-item" onContextMenu={(event) => rest.onGroupMenu(event, group)}>
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

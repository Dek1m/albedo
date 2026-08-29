import { useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import type { DomainGroup, DomainOu, DomainUser } from '../../api/adminApi';
import type { DomainSelection } from './domainSelection';

interface DomainTreeProps {
  tree: DomainOu[];
  selection: DomainSelection | null;
  onSelectOu: (ou: DomainOu) => void;
  onSelectUser: (user: DomainUser) => void;
  onSelectGroup: (group: DomainGroup) => void;
  onFolderMenu: (event: ReactMouseEvent, ou: DomainOu) => void;
  onUserMenu: (event: ReactMouseEvent, user: DomainUser) => void;
  onGroupMenu: (event: ReactMouseEvent, group: DomainGroup) => void;
}

function ouIcon(node: DomainOu): string {
  if (node.kind === 'users_bin') {
    return 'bi-people';
  }
  if (node.kind === 'groups_bin') {
    return 'bi-collection';
  }
  if (node.isSystem && node.parentId === null) {
    return 'bi-building';
  }
  if (node.isSystem || node.isBuiltin) {
    return 'bi-gear-wide-connected';
  }
  return 'bi-folder';
}

function focused(selection: DomainSelection | null, kind: DomainSelection['type'], id: string): boolean {
  return selection?.type === kind && selection.id === id;
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
  const selected = focused(rest.selection, 'ou', node.id);
  return (
    <li>
      <div
        className={`albedo-tree-item${selected ? ' is-focused is-selected active' : ''}`}
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
        <i className={`bi ${ouIcon(node)}`} />
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
                className={`albedo-tree-item${focused(rest.selection, 'user', user.id) ? ' is-focused is-selected active' : ''}`}
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
              <div
                className={`albedo-tree-item${focused(rest.selection, 'group', group.id) ? ' is-focused is-selected active' : ''}`}
                onClick={() => rest.onSelectGroup(group)}
                onContextMenu={(event) => rest.onGroupMenu(event, group)}
              >
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

import type { ReactElement } from 'react';
import { DropdownMenu } from '../../shared/ui/DropdownMenu';

export type SystemPane = 'users' | 'modules' | 'preferences';

interface SystemMenuProps {
  onOpen: (pane: SystemPane) => void;
}

export function SystemMenu({ onOpen }: SystemMenuProps): ReactElement {
  return (
    <DropdownMenu
      label="System"
      onTriggerClick={() => onOpen('users')}
      items={[
        { id: 'users', label: 'Users & Roles', onSelect: () => onOpen('users') },
        { id: 'modules', label: 'Modules', onSelect: () => onOpen('modules') },
        { id: 'preferences', label: 'Preferences', onSelect: () => onOpen('preferences') },
      ]}
    />
  );
}

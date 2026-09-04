import type { ReactElement } from 'react';
import { DropdownMenu } from '../../shared/ui/DropdownMenu';

export type AiPane = 'agents' | 'models' | 'providers';

interface AiMenuProps {
  onOpen: (pane: AiPane) => void;
}

export function AiMenu({ onOpen }: AiMenuProps): ReactElement {
  return (
    <DropdownMenu
      label="AI"
      onTriggerClick={() => onOpen('agents')}
      items={[
        { id: 'agents', label: 'Agents', onSelect: () => onOpen('agents') },
        { id: 'models', label: 'Models', onSelect: () => onOpen('models') },
        { id: 'providers', label: 'Providers…', onSelect: () => onOpen('providers') },
      ]}
    />
  );
}

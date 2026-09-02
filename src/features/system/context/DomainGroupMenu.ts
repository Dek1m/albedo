import type { DomainGroup } from '../../../api/systemApi';
import type { MenuItem } from '../../../shared/ui/ContextMenu';

export interface DomainGroupActions {
  onRename: (group: DomainGroup) => void;
  onDelete: (group: DomainGroup) => void;
}

export class DomainGroupMenu {
  constructor(private readonly actions: DomainGroupActions) {}

  items(target: DomainGroup): MenuItem[] {
    return [
      {
        id: 'rename',
        label: 'Rename',
        disabled: target.isBuiltin,
        action: () => this.actions.onRename(target),
      },
      {
        id: 'delete',
        label: 'Delete',
        disabled: target.isBuiltin,
        action: () => this.actions.onDelete(target),
      },
    ];
  }
}

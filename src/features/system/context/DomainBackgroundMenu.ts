import type { MenuItem } from '../../../shared/ui/ContextMenu';

export interface DomainBackgroundActions {
  onCreateDomain: () => void;
  /** false — нет права domains:create, пункт подсвечивается выключенным. */
  canCreateDomain?: boolean;
}

/** ПКМ по пустому фону дерева: точка входа для создания домена. */
export class DomainBackgroundMenu {
  constructor(private readonly actions: DomainBackgroundActions) {}

  items(): MenuItem[] {
    return [
      {
        id: 'create-domain',
        label: 'Create domain',
        disabled: this.actions.canCreateDomain === false,
        action: () => this.actions.onCreateDomain(),
      },
    ];
  }
}

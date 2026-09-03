import type { SystemModule } from '../../../api/systemApi';
import type { MenuItem } from '../../../shared/ui/ContextMenu';

export interface ModuleActions {
  onReload: (mod: SystemModule) => void;
  onCheckUpdate: (mod: SystemModule) => void;
  onUpdate: (mod: SystemModule) => void;
  onUnload: (mod: SystemModule) => void;
  onDisable: (mod: SystemModule) => void;
  onEnable: (mod: SystemModule) => void;
  onDelete: (mod: SystemModule) => void;
}

export class ModuleMenu {
  constructor(private readonly actions: ModuleActions) {}

  items(target: SystemModule, pendingVersion?: string): MenuItem[] {
    const core = target.isSystem;
    const disabled = target.status === 'disabled';
    const items: MenuItem[] = [
      {
        id: 'reload',
        label: 'Reload',
        action: () => this.actions.onReload(target),
      },
    ];
    if (pendingVersion) {
      items.push({
        id: 'update',
        label: `Update to ${pendingVersion}`,
        action: () => this.actions.onUpdate(target),
      });
    } else {
      items.push({
        id: 'check_update',
        label: 'Check for update',
        action: () => this.actions.onCheckUpdate(target),
      });
    }
    items.push(
      {
        id: 'unload',
        label: 'Unload',
        disabled: core,
        action: () => this.actions.onUnload(target),
      },
      {
        id: 'disable',
        label: 'Disable',
        disabled: core,
        action: () => this.actions.onDisable(target),
      },
    );
    if (disabled) {
      items.push({
        id: 'enable',
        label: 'Enable',
        action: () => this.actions.onEnable(target),
      });
    }
    items.push({
      id: 'delete',
      label: 'Delete',
      disabled: core,
      action: () => this.actions.onDelete(target),
    });
    return items;
  }
}

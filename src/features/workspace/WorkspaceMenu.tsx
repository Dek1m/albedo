import type { ReactElement } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { DropdownMenu } from '../../shared/ui/DropdownMenu';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';

interface WorkspaceMenuProps {
  onOpenList: () => void;
  onOpenSessions: () => void;
}

export function WorkspaceMenu({ onOpenList, onOpenSessions }: WorkspaceMenuProps): ReactElement {
  const active = useWorkspaceStore((s) => s.active);
  const closeDashboard = useWorkspaceStore((s) => s.closeDashboard);

  return (
    <DropdownMenu
      label="Workspace"
      onTriggerClick={onOpenList}
      items={[
        {
          id: 'sessions',
          label: 'Sessions',
          disabled: !active,
          onSelect: onOpenSessions,
        },
        {
          id: 'close',
          label: 'Close workspace',
          disabled: !active,
          onSelect: () => {
            closeDashboard();
            toast('Workspace closed', 'info');
          },
        },
        {
          id: 'all',
          label: 'All workspaces…',
          onSelect: onOpenList,
        },
      ]}
    />
  );
}

export async function loadCatalog(): Promise<void> {
  const setCatalog = useWorkspaceStore.getState().setCatalog;
  try {
    setCatalog(await workspaceApi.list());
  } catch (err) {
    toast(humanMessage(err));
  }
}

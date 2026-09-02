import type { ReactElement } from 'react';
import { AdminWindow } from './AdminWindow';
import { ModulesWindow } from './ModulesWindow';
import { PreferencesWindow } from './PreferencesWindow';
import type { SystemPane } from './SystemMenu';

interface SystemWindowsProps {
  pane: SystemPane | null;
  onClose: () => void;
}

export function SystemWindows({ pane, onClose }: SystemWindowsProps): ReactElement {
  return (
    <>
      <AdminWindow open={pane === 'users'} onClose={onClose} />
      <ModulesWindow open={pane === 'modules'} onClose={onClose} />
      <PreferencesWindow open={pane === 'preferences'} onClose={onClose} />
    </>
  );
}

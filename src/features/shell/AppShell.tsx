import type { ReactElement } from 'react';
import { UserSettingsModal } from '../settings/UserSettingsModal';
import { UserChip } from './UserChip';

export function AppShell(): ReactElement {
  return (
    <div className="albedo-shell">
      <header className="albedo-header">
        <span className="albedo-brand">Albedo</span>
        <UserChip />
      </header>
      <main className="albedo-workspace" />
      <UserSettingsModal />
    </div>
  );
}

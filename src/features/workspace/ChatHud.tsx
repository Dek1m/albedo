import type { ReactElement } from 'react';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import type { RightSidebarTab } from '../../workspace/WorkspaceStore';

const BUTTONS: readonly { tab: RightSidebarTab; icon: string; label: string }[] = [
  { tab: 'context', icon: 'bi-card-text', label: 'Context' },
  { tab: 'history', icon: 'bi-clock-history', label: 'History' },
  { tab: 'tools', icon: 'bi-sliders', label: 'Tools' },
];

/** Плавающая пилюля значков над областью сообщений. Скрыта, пока открыт инспектор. */
export function ChatHud(): ReactElement | null {
  const inspectorOpen = useWorkspaceStore((s) => s.rightSidebarOpen);
  const openInspector = useWorkspaceStore((s) => s.openRightSidebar);
  if (inspectorOpen) {
    return null;
  }
  return (
    <div className="albedo-chat-hud" role="toolbar" aria-label="Chat tools">
      {BUTTONS.map((item) => (
        <button
          key={item.tab}
          type="button"
          className="albedo-chat-hud-btn"
          title={item.label}
          aria-label={item.label}
          onClick={() => openInspector(item.tab)}
        >
          <i className={`bi ${item.icon}`} />
        </button>
      ))}
    </div>
  );
}

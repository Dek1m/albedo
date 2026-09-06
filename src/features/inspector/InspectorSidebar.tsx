import type { ReactElement } from 'react';
import { PanelGrip } from '../../shared/ui/PanelGrip';
import {
  RIGHT_SIDEBAR_MAX,
  RIGHT_SIDEBAR_MIN,
  useWorkspaceStore,
} from '../../workspace/WorkspaceStore';
import type { RightSidebarTab } from '../../workspace/WorkspaceStore';
import { ContextPanel } from './ContextPanel';

const TABS: readonly { id: RightSidebarTab; label: string }[] = [
  { id: 'context', label: 'Context' },
  { id: 'history', label: 'History' },
  { id: 'tools', label: 'Tools' },
];

export function InspectorSidebar(): ReactElement {
  const width = useWorkspaceStore((s) => s.rightSidebarWidth);
  const setWidth = useWorkspaceStore((s) => s.setRightSidebarWidth);
  const tab = useWorkspaceStore((s) => s.rightSidebarTab);
  const setTab = useWorkspaceStore((s) => s.setRightSidebarTab);
  const close = useWorkspaceStore((s) => s.setRightSidebarOpen);

  return (
    <aside className="albedo-inspector" style={{ width }} aria-label="Inspector">
      <PanelGrip
        axis="x"
        flip
        value={width}
        min={RIGHT_SIDEBAR_MIN}
        max={RIGHT_SIDEBAR_MAX}
        onChange={setWidth}
      />
      <header className="albedo-inspector-head">
        <h2 className="albedo-inspector-title">Inspector</h2>
        <button
          type="button"
          className="albedo-icon-btn"
          title="Close"
          aria-label="Close inspector"
          onClick={() => close(false)}
        >
          <i className="bi bi-x-lg" />
        </button>
      </header>
      <div className="albedo-inspector-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`albedo-inspector-tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="albedo-inspector-body">
        {tab === 'context' ? <ContextPanel /> : <p className="albedo-inspect-stub">Not implemented yet</p>}
      </div>
    </aside>
  );
}

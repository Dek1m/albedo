import { Suspense, lazy } from 'react';
import type { ReactElement } from 'react';
import { PanelGrip } from '../../shared/ui/PanelGrip';
import { dockHeightMax, useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { ContextTab } from './ContextTab';
import { MessageTab } from './MessageTab';
import type { DockTab } from './dockTypes';

// xterm тяжёлый — грузим вкладку терминала только по открытию.
const TerminalTab = lazy(() =>
  import('./TerminalTab').then((module) => ({ default: module.TerminalTab })),
);

export function Dock(): ReactElement {
  const height = useWorkspaceStore((s) => s.dockHeight);
  const setDockHeight = useWorkspaceStore((s) => s.setDockHeight);
  const tab = useWorkspaceStore((s) => s.dockTab);
  const setDockTab = useWorkspaceStore((s) => s.setDockTab);
  const max = dockHeightMax();

  return (
    <section className="albedo-dock" style={{ height }} aria-label="Dock">
      <PanelGrip axis="y" value={height} min={120} max={max} onChange={setDockHeight} />
      <div className="albedo-dock-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'message'}
          className={`albedo-dock-tab${tab === 'message' ? ' is-active' : ''}`}
          onClick={() => setDockTab('message' satisfies DockTab)}
        >
          Message
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'terminal'}
          className={`albedo-dock-tab${tab === 'terminal' ? ' is-active' : ''}`}
          onClick={() => setDockTab('terminal' satisfies DockTab)}
        >
          Terminal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'context'}
          className={`albedo-dock-tab${tab === 'context' ? ' is-active' : ''}`}
          onClick={() => setDockTab('context' satisfies DockTab)}
        >
          Context
        </button>
      </div>
      <div className="albedo-dock-body">
        <div className={`albedo-dock-pane${tab === 'message' ? '' : ' is-hidden'}`}>
          <MessageTab />
        </div>
        {tab === 'terminal' ? (
          <Suspense fallback={<div className="albedo-term-tab" />}>
            <TerminalTab />
          </Suspense>
        ) : null}
        <div className={`albedo-dock-pane${tab === 'context' ? '' : ' is-hidden'}`}>
          <ContextTab />
        </div>
      </div>
    </section>
  );
}

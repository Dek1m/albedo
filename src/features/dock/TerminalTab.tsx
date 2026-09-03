import type { ReactElement } from 'react';

const GATE = 'Terminal waits for ADR-006';

export function TerminalTab(): ReactElement {
  return (
    <div className="albedo-term-tab">
      <div className="albedo-term-out">{GATE}</div>
      <aside className="albedo-term-sessions">
        <div className="albedo-term-session-bar">
          <button type="button" className="albedo-icon-btn" disabled title={GATE} aria-label="New session">
            +
          </button>
          <button type="button" className="albedo-icon-btn" disabled title={GATE} aria-label="Delete session">
            <i className="bi bi-trash" />
          </button>
        </div>
        <ul className="albedo-term-session-list" />
      </aside>
    </div>
  );
}

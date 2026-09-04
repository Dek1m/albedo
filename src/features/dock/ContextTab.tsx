import type { ReactElement } from 'react';

interface MetricRow {
  label: string;
  value: string;
}

const IDLE: MetricRow[] = [
  { label: 'Status', value: 'idle' },
  { label: 'Tokens in', value: '0' },
  { label: 'Tokens out', value: '0' },
  { label: 'Cache', value: '0' },
  { label: 'Cache hits', value: '0' },
];

export function ContextTab(): ReactElement {
  return (
    <div className="albedo-context-tab" title="Loop usage: no RPC yet">
      <p className="albedo-context-hint">Current run</p>
      <dl className="albedo-context-metrics">
        {IDLE.map((row) => (
          <div key={row.label} className="albedo-context-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

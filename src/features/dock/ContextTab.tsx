import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { llmApi } from '../../api/llmApi';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { useLoopMetrics } from './loopMetrics';

export function ContextTab(): ReactElement {
  const focused = useWorkspaceStore((s) => s.focusedSessionId);
  const status = useLoopMetrics((s) => s.status);
  const tokensIn = useLoopMetrics((s) => s.tokensIn);
  const tokensOut = useLoopMetrics((s) => s.tokensOut);
  const cacheTokens = useLoopMetrics((s) => s.cacheTokens);
  const cacheHits = useLoopMetrics((s) => s.cacheHits);
  const setMetrics = useLoopMetrics((s) => s.setMetrics);

  useEffect(() => {
    if (!focused) {
      return;
    }
    let cancelled = false;
    void llmApi
      .runUsage(focused)
      .then((row) => {
        if (!cancelled) {
          setMetrics({
            status: row.status,
            tokensIn: row.tokensIn,
            tokensOut: row.tokensOut,
            cacheTokens: row.cacheTokens,
            cacheHits: row.cacheHits,
          });
        }
      })
      .catch(() => {
        /* idle */
      });
    return () => {
      cancelled = true;
    };
  }, [focused, setMetrics]);

  const rows = [
    { label: 'Status', value: status },
    { label: 'Tokens in', value: String(tokensIn) },
    { label: 'Tokens out', value: String(tokensOut) },
    { label: 'Cache', value: String(cacheTokens) },
    { label: 'Cache hits', value: String(cacheHits) },
  ];

  return (
    <div className="albedo-context-tab">
      <p className="albedo-context-hint">Current run</p>
      <dl className="albedo-context-metrics">
        {rows.map((row) => (
          <div key={row.label} className="albedo-context-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

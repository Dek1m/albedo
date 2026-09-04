import { useState } from 'react';
import type { ReactElement } from 'react';
import { MarkdownView } from '../../shared/ui/MarkdownView';
import { useSmoothText } from './useSmoothText';

export interface StageView {
  kind: string;
  name: string;
  args?: string;
  status: string;
}

interface AgentBubbleProps {
  name: string;
  content: string;
  reasoning: string;
  stages: StageView[];
  live?: boolean;
}

function toolRows(stages: StageView[], live: boolean, reasoning: string): StageView[] {
  const rows = stages.filter((stage) => stage.kind !== 'text');
  if (rows.length > 0) {
    return rows;
  }
  if (live || reasoning) {
    return [{ kind: 'reasoning', name: 'Reasoning', status: live && !reasoning ? 'running' : 'done' }];
  }
  return [];
}

export function AgentBubble({ name, content, reasoning, stages, live }: AgentBubbleProps): ReactElement {
  const [open, setOpen] = useState(false);
  const rows = toolRows(stages, Boolean(live), reasoning);
  const text = useSmoothText(content, Boolean(live));

  return (
    <article className={`albedo-bubble albedo-bubble--agent albedo-turn${live ? ' is-live' : ''}`}>
      {name ? <header>{name}</header> : null}
      {rows.length > 0 ? (
        <div className="albedo-steps">
          {rows.map((stage, index) => {
            const running = stage.status === 'running';
            const reasoningRow = stage.kind === 'reasoning';
            return (
              <div key={`${stage.kind}-${stage.name}-${String(index)}`} className="albedo-step">
                <div className="albedo-step-head">
                  <span className={`albedo-step-dot${running ? ' is-running' : ''}`} aria-hidden />
                  {reasoningRow ? (
                    <button
                      type="button"
                      className="albedo-reasoning-toggle"
                      aria-expanded={open}
                      onClick={() => setOpen((value) => !value)}
                    >
                      Reasoning <span aria-hidden>{open ? '▾' : '>'}</span>
                    </button>
                  ) : (
                    <p className="albedo-tool-line">
                      <span>{stage.name}</span>
                      {stage.args ? <span className="albedo-stage-args"> {stage.args}</span> : null}
                    </p>
                  )}
                </div>
                {reasoningRow && open ? (
                  <div className="albedo-reasoning-pane">
                    <p className="albedo-reasoning-text">{reasoning}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {text ? <MarkdownView text={text} /> : null}
    </article>
  );
}

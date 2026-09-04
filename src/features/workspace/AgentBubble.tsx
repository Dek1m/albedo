import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { MarkdownView } from '../../shared/ui/MarkdownView';

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

export function AgentBubble({ name, content, reasoning, stages, live }: AgentBubbleProps): ReactElement {
  const [open, setOpen] = useState(Boolean(live && reasoning));
  useEffect(() => {
    if (live && reasoning) {
      setOpen(true);
    }
  }, [live, reasoning]);
  const rail = stages.length > 0 ? stages : live ? [{ kind: 'text', name: 'Answer', status: 'running' }] : [];
  const empty = live && !content && !reasoning;

  return (
    <div className={`albedo-turn${live ? ' is-live' : ''}`}>
      {rail.length > 0 ? (
        <ol className="albedo-stages" aria-label="Run stages">
          {rail.map((stage, index) => (
            <li
              key={`${stage.kind}-${stage.name}-${String(index)}`}
              className={`albedo-stage albedo-stage--${stage.kind}${stage.status === 'running' ? ' is-running' : ''}`}
            >
              <span className="albedo-stage-dot" aria-hidden />
              {stage.kind === 'reasoning' ? (
                <button
                  type="button"
                  className="albedo-stage-toggle"
                  aria-expanded={open}
                  onClick={() => setOpen((value) => !value)}
                >
                  {stage.name} <span aria-hidden>{open ? '▾' : '>'}</span>
                </button>
              ) : (
                <span className={`albedo-stage-name${stage.status === 'running' ? ' is-running' : ''}`}>
                  {stage.name}
                </span>
              )}
              {stage.kind === 'tool' && stage.args ? <span className="albedo-stage-args">{stage.args}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
      <article className="albedo-bubble albedo-bubble--agent">
        <header>{name || 'Agent'}</header>
        {reasoning ? (
          <div className={`albedo-reasoning${open ? ' is-open' : ''}`}>
            {open ? <p className="albedo-reasoning-text">{reasoning}</p> : null}
          </div>
        ) : null}
        {empty ? (
          <div className="albedo-skeleton" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        ) : (
          <MarkdownView text={content} />
        )}
      </article>
    </div>
  );
}

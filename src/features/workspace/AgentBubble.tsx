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
  const [open, setOpen] = useState(false);
  const rail = (stages.length > 0 ? stages : live ? [{ kind: 'reasoning', name: 'Reasoning', status: 'running' }] : [])
    .filter((stage) => stage.kind !== 'text');
  const tools = rail.filter((stage) => stage.kind === 'tool');
  const reasoningStage = rail.find((stage) => stage.kind === 'reasoning');
  const showReasoning = Boolean(reasoning || reasoningStage);

  useEffect(() => {
    if (!live) {
      setOpen(false);
    }
  }, [live]);

  return (
    <div className={`albedo-turn${live ? ' is-live' : ''}`}>
      {rail.length > 0 ? (
        <ol className="albedo-stages" aria-hidden>
          {rail.map((stage, index) => (
            <li
              key={`${stage.kind}-${stage.name}-${String(index)}`}
              className={`albedo-stage${stage.status === 'running' ? ' is-running' : ''}`}
            >
              <span className="albedo-stage-dot" />
            </li>
          ))}
        </ol>
      ) : null}
      <article className="albedo-bubble albedo-bubble--agent">
        <header>{name || 'Agent'}</header>
        {showReasoning ? (
          <div className="albedo-reasoning">
            <button
              type="button"
              className="albedo-reasoning-toggle"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              Reasoning <span aria-hidden>{open ? '▾' : '>'}</span>
            </button>
            {open && reasoning ? <p className="albedo-reasoning-text">{reasoning}</p> : null}
          </div>
        ) : null}
        {tools.map((stage, index) => (
          <p key={`${stage.name}-${String(index)}`} className="albedo-tool-line">
            <span className={stage.status === 'running' ? 'is-running' : ''}>{stage.name}</span>
            {stage.args ? <span className="albedo-stage-args"> {stage.args}</span> : null}
          </p>
        ))}
        {content ? <MarkdownView text={content} /> : null}
      </article>
    </div>
  );
}

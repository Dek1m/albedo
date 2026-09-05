import { memo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { MarkdownView } from '../../shared/ui/MarkdownView';
import { sameStages } from '../dock/loopMetrics';
import { useSmoothText } from './useSmoothText';

function reasoningParagraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
}

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
  reasoningOpen?: boolean;
  onReasoningToggle?: () => void;
}

function toolRows(stages: StageView[], live: boolean, reasoning: string, content: string): StageView[] {
  const rows = stages.filter((stage) => stage.kind !== 'text');
  if (rows.some((stage) => stage.kind === 'reasoning')) {
    return rows;
  }
  if (reasoning) {
    return [{ kind: 'reasoning', name: 'Reasoning', status: live ? 'running' : 'done' }, ...rows];
  }
  if (live && !content) {
    // Первый токен ещё не пришёл — рисуем скелетон вместо этапов.
    return [];
  }
  return rows;
}

// Полл каждые 120 мс приносит новый массив stages — сравниваем по содержимому, иначе memo бесполезен.
export const AgentBubble = memo(function AgentBubble({
  name,
  content,
  reasoning,
  stages,
  live,
  reasoningOpen,
  onReasoningToggle,
}: AgentBubbleProps): ReactElement {
  const [openState, setOpenState] = useState(false);
  const open = reasoningOpen ?? openState;
  const paneRef = useRef<HTMLDivElement>(null);
  const text = useSmoothText(content, Boolean(live));
  const waiting = Boolean(live) && !text && !reasoning;
  const rows = waiting ? [] : toolRows(stages, Boolean(live), reasoning, text);
  // Пунктир заканчиваем точкой, если после reasoning тулов нет — дальше ответ.
  const reasoningIndex = rows.findIndex((stage) => stage.kind === 'reasoning');
  const hasToolAfter = rows
    .slice(reasoningIndex + 1)
    .some((stage) => stage.kind === 'tool');
  const reasoningIsTail = reasoningIndex >= 0 && !hasToolAfter;

  const toggleReasoning = (): void => {
    if (onReasoningToggle) {
      onReasoningToggle();
    } else {
      setOpenState((value) => !value);
    }
    // Раскрытая панель целиком на виду.
    requestAnimationFrame(() => {
      paneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  return (
    <article className={`albedo-bubble albedo-bubble--agent albedo-turn${live ? ' is-live' : ''}`}>
      {name ? <header>{name}</header> : null}
      {!waiting && rows.length > 0 ? (
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
                      onClick={toggleReasoning}
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
                  <div className={`albedo-reasoning-pane${reasoningIsTail ? ' is-tail' : ''}`} ref={paneRef}>
                    {reasoningParagraphs(reasoning).map((block, index) => (
                      <p key={String(index)} className="albedo-reasoning-text">{block}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {waiting ? (
        <div className="albedo-skeleton" aria-hidden>
          <div className="albedo-skeleton-line" />
          <div className="albedo-skeleton-line" />
          <div className="albedo-skeleton-line is-short" />
        </div>
      ) : null}
      {text ? <MarkdownView text={text} /> : null}
    </article>
  );
}, (prev, next) =>
  prev.name === next.name &&
  prev.content === next.content &&
  prev.reasoning === next.reasoning &&
  prev.live === next.live &&
  prev.reasoningOpen === next.reasoningOpen &&
  prev.onReasoningToggle === next.onReasoningToggle &&
  sameStages(prev.stages, next.stages),
);

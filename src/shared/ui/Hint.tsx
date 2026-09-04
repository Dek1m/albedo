import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';

interface HintProps {
  text: string;
}

const SHOW_MS = 140;

interface CloudPos {
  x: number;
  y: number;
}

export function Hint({ text }: HintProps): ReactElement | null {
  const id = useId();
  const icon = useRef<HTMLButtonElement>(null);
  const showTimer = useRef(0);
  const hideTimer = useRef(0);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pos, setPos] = useState<CloudPos>({ x: 0, y: 0 });

  useEffect(() => () => {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(hideTimer.current);
  }, []);

  if (!text) {
    return null;
  }

  const place = (): void => {
    const node = icon.current;
    if (!node) {
      return;
    }
    const box = node.getBoundingClientRect();
    setPos({ x: box.left + box.width / 2, y: box.top });
  };

  const reveal = (): void => {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(showTimer.current);
    showTimer.current = window.setTimeout(() => {
      place();
      setLeaving(false);
      setOpen(true);
    }, SHOW_MS);
  };

  const conceal = (): void => {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => {
        setOpen(false);
        setLeaving(false);
      }, 160);
    }, 80);
  };

  return (
    <span className="albedo-hint">
      <button
        ref={icon}
        type="button"
        className="albedo-hint-icon"
        aria-label="Help"
        aria-describedby={open ? id : undefined}
        onMouseEnter={reveal}
        onMouseLeave={conceal}
        onFocus={reveal}
        onBlur={conceal}
      >
        <i className="bi bi-question-circle" aria-hidden="true" />
      </button>
      {open
        ? createPortal(
            <div
              id={id}
              role="tooltip"
              className={`albedo-hint-cloud${leaving ? ' is-leave' : ''}`}
              style={{ left: pos.x, top: pos.y }}
              onMouseEnter={() => {
                window.clearTimeout(hideTimer.current);
                setLeaving(false);
              }}
              onMouseLeave={conceal}
            >
              <span className="albedo-hint-tail" />
              {text}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

import { useCallback } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactElement } from 'react';

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface PanelGripProps {
  axis: 'x' | 'y';
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}

export function PanelGrip({ axis, value, min, max, onChange }: PanelGripProps): ReactElement {
  const apply = useCallback(
    (next: number): void => {
      onChange(clampValue(next, min, max));
    },
    [max, min, onChange],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const start = axis === 'x' ? event.clientX : event.clientY;
    const origin = value;
    const move = (ev: PointerEvent): void => {
      const delta = axis === 'x' ? ev.clientX - start : start - ev.clientY;
      apply(origin + delta);
    };
    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = 16;
    if (axis === 'x' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      apply(value + (event.key === 'ArrowRight' ? step : -step));
    }
    if (axis === 'y' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      apply(value + (event.key === 'ArrowUp' ? step : -step));
    }
  };

  return (
    <div
      className={`albedo-grip albedo-grip--${axis}`}
      role="separator"
      tabIndex={0}
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <span className="albedo-grip-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampValue, PanelGrip } from './PanelGrip';

describe('PanelGrip', () => {
  afterEach(() => cleanup());

  it('clamps', () => {
    expect(clampValue(10, 180, 420)).toBe(180);
    expect(clampValue(500, 180, 420)).toBe(420);
    expect(clampValue(240, 180, 420)).toBe(240);
  });

  it('moves width with arrows', () => {
    const onChange = vi.fn();
    render(<PanelGrip axis="x" value={200} min={180} max={420} onChange={onChange} />);
    const grip = screen.getByRole('separator');
    fireEvent.keyDown(grip, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(216);
    fireEvent.keyDown(grip, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(184);
  });

  it('clamps keydown at max', () => {
    const onChange = vi.fn();
    render(<PanelGrip axis="y" value={200} min={120} max={200} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith(200);
  });
});

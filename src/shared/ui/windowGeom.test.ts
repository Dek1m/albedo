import { afterEach, describe, expect, it } from 'vitest';
import { cascadeBox, centerFrameBox, growHeightSnapY, topCenterBox } from './windowGeom';

function stubViewport(vw: number, vh: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: vw });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
}

afterEach(() => {
  stubViewport(1024, 768);
});

describe('windowGeom', () => {
  it('growHeightSnapY не меняет x', () => {
    stubViewport(1000, 800);
    const box = { x: 140, y: 80, w: 420, h: 300 };
    const grown = growHeightSnapY(box, 500);
    expect(grown.x).toBe(140);
    expect(grown.w).toBe(420);
  });

  it('growHeightSnapY: h не больше vh', () => {
    stubViewport(1000, 800);
    const box = { x: 140, y: 80, w: 420, h: 300 };
    const grown = growHeightSnapY(box, 4000);
    expect(grown.h).toBeLessThanOrEqual(800);
    expect(grown.y).toBe(0);
    expect(grown.x).toBe(140);
  });

  it('cascadeBox смещает на +28', () => {
    stubViewport(1200, 900);
    const parent = { x: 100, y: 50, w: 480, h: 360 };
    const child = cascadeBox(parent);
    expect(child.x).toBe(128);
    expect(child.y).toBe(78);
    expect(child.w).toBe(480);
    expect(child.h).toBe(360);
  });

  it('topCenterBox: y маленький, x по центру', () => {
    stubViewport(1000, 800);
    const box = topCenterBox();
    expect(box.y).toBeLessThan(16);
    expect(box.x).toBeCloseTo((1000 - box.w) / 2);
  });

  it('centerFrameBox: по центру viewport', () => {
    stubViewport(1000, 800);
    const box = centerFrameBox();
    expect(box.x).toBeCloseTo((1000 - box.w) / 2);
    expect(box.y).toBeCloseTo((800 - box.h) / 2);
  });
});

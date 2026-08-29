export interface WindowBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WindowRatio {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MARGIN = 0.2;
const MIN_W = 360;
const MIN_H = 280;

export function viewport(): { vw: number; vh: number } {
  return { vw: window.innerWidth, vh: window.innerHeight };
}

export function defaultBox(): WindowBox {
  const { vw, vh } = viewport();
  return clampBox({
    x: vw * MARGIN,
    y: vh * MARGIN,
    w: vw * (1 - 2 * MARGIN),
    h: vh * (1 - 2 * MARGIN),
  });
}

export function clampBox(box: WindowBox): WindowBox {
  const { vw, vh } = viewport();
  const w = Math.min(vw, Math.max(Math.min(MIN_W, vw), box.w));
  const h = Math.min(vh, Math.max(Math.min(MIN_H, vh), box.h));
  return {
    w,
    h,
    x: Math.min(Math.max(0, box.x), Math.max(0, vw - w)),
    y: Math.min(Math.max(0, box.y), Math.max(0, vh - h)),
  };
}

export function toRatio(box: WindowBox): WindowRatio {
  const { vw, vh } = viewport();
  return {
    x: box.x / Math.max(1, vw),
    y: box.y / Math.max(1, vh),
    w: box.w / Math.max(1, vw),
    h: box.h / Math.max(1, vh),
  };
}

export function fromRatio(ratio: WindowRatio): WindowBox {
  const { vw, vh } = viewport();
  return clampBox({
    x: ratio.x * vw,
    y: ratio.y * vh,
    w: ratio.w * vw,
    h: ratio.h * vh,
  });
}

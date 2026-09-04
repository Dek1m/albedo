import { useEffect, useRef, useState } from 'react';

export function useSmoothText(target: string, active: boolean): string {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  shownRef.current = shown;

  useEffect(() => {
    if (!active) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    let frame = 0;
    const tick = (): void => {
      const prev = shownRef.current;
      if (prev === target) {
        return;
      }
      let next = target;
      if (target.startsWith(prev)) {
        const left = target.length - prev.length;
        const step = Math.max(1, Math.ceil(left / 24));
        next = target.slice(0, prev.length + step);
      }
      shownRef.current = next;
      setShown(next);
      if (next !== target) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active]);

  return active ? shown : target;
}

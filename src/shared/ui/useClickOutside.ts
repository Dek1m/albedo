import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useClickOutside(
  open: boolean,
  ref: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) {
      return;
    }
    const refs = Array.isArray(ref) ? ref : [ref];
    const onPointer = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (refs.some((item) => item.current?.contains(target))) {
        return;
      }
      onClose();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, ref, onClose]);
}

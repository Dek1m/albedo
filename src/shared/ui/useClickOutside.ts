import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useClickOutside(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: PointerEvent): void => {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, ref, onClose]);
}

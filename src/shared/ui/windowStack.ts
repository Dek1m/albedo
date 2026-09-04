import type { WindowBox } from './windowGeom';

const stack: { id: string; box: WindowBox }[] = [];

export function pushWindow(id: string, box: WindowBox): void {
  pullWindow(id);
  stack.push({ id, box });
}

export function pullWindow(id: string): void {
  const index = stack.findIndex((item) => item.id === id);
  if (index >= 0) {
    stack.splice(index, 1);
  }
}

export function moveWindow(id: string, box: WindowBox): void {
  const item = stack.find((entry) => entry.id === id);
  if (item) {
    item.box = box;
  }
}

export function topmostWindow(exceptId?: string): WindowBox | null {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const item = stack[i];
    if (item && item.id !== exceptId) {
      return item.box;
    }
  }
  return null;
}

export function resetWindowStack(): void {
  stack.length = 0;
}

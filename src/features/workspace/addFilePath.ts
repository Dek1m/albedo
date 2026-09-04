export function joinHomeRel(parent: string, name: string): string {
  const base = parent.replace(/^\/+|\/+$/g, '');
  const tail = name.replace(/^\/+/, '').replace(/\/+$/g, '');
  if (tail.includes('..')) {
    throw new Error('invalid path');
  }
  if (!base) {
    return tail;
  }
  if (!tail) {
    return base;
  }
  return `${base}/${tail}`;
}

export function homeDisplay(rel: string): string {
  return rel ? `~/${rel}` : '~/';
}

export function bytesLabel(size: number): string {
  return `${String(size)} B`;
}

import type { ReactElement } from 'react';

export function BusyDots(): ReactElement {
  return (
    <span className="albedo-busy-dots" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

import type { ReactElement } from 'react';
import { neutralizeBidi } from './neutralizeBidi';

interface SafeNameProps {
  value: string;
  className?: string;
}

export function SafeName({ value, className }: SafeNameProps): ReactElement {
  const text = neutralizeBidi(value);
  return (
    <span className={`albedo-safe-name${className ? ` ${className}` : ''}`} dir="auto" title={text}>
      {text}
    </span>
  );
}

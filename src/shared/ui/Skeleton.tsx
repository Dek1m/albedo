import type { ReactElement } from 'react';

interface SkeletonProps {
  lines?: number;
  className?: string;
}

export function Skeleton({ lines = 4, className }: SkeletonProps): ReactElement {
  return (
    <div className={`albedo-skeleton${className ? ` ${className}` : ''}`} aria-hidden>
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          className={`albedo-skeleton-line${index === 0 ? ' is-short' : ''}`}
        />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }): ReactElement {
  return (
    <ul className="albedo-skeleton-list" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="albedo-skeleton-row">
          <span className="albedo-skeleton-block" />
          <span className="albedo-skeleton-line is-short" />
        </li>
      ))}
    </ul>
  );
}

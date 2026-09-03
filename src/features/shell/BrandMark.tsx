import type { ElementType, ReactElement } from 'react';

interface BrandMarkProps {
  as?: ElementType;
}

export function BrandMark({ as: Tag = 'span' }: BrandMarkProps): ReactElement {
  return (
    <Tag className="albedo-brand" aria-label="albedo">
      <span className="albedo-brand-alpha" aria-hidden="true">
        α
      </span>
      lbedo
    </Tag>
  );
}

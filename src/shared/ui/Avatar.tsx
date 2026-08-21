import type { ReactElement } from 'react';
import { initials } from '../../domain/user';

interface AvatarProps {
  label: string;
  src?: string | null;
  size?: number;
}

export function Avatar({ label, src, size = 36 }: AvatarProps): ReactElement {
  const dim = { width: size, height: size };
  if (src) {
    return (
      <img
        className="albedo-avatar-img"
        src={src}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span className="albedo-avatar-fallback" style={dim} aria-hidden>
      {initials(label)}
    </span>
  );
}

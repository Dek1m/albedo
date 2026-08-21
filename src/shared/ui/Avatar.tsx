import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { initials } from '../../domain/user';

interface AvatarProps {
  label: string;
  src?: string | null;
  size?: number;
}

export function Avatar({ label, src, size = 28 }: AvatarProps): ReactElement {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);
  const dim = { width: size, height: size };
  if (src && !broken) {
    return (
      <img
        className="albedo-avatar-img"
        src={src}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="albedo-avatar-fallback" style={dim} aria-hidden>
      {initials(label)}
    </span>
  );
}

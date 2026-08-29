import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { initials } from '../../domain/user';

interface AvatarProps {
  label: string;
  src?: string | null;
  size?: number;
}

export function Avatar({ label, src, size = 28 }: AvatarProps): ReactElement {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const dim = { width: size, height: size };

  useEffect(() => {
    if (!src) {
      setBlobUrl(null);
      return;
    }
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setBlobUrl(src);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    fetch(src, { credentials: 'include' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('avatar fetch failed');
        }
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setBlobUrl(null);
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (blobUrl) {
    return (
      <img
        className="albedo-avatar-img"
        src={blobUrl}
        alt=""
        width={size}
        height={size}
      />
    );
  }
  return (
    <span className="albedo-avatar-fallback" style={dim} aria-hidden>
      {initials(label)}
    </span>
  );
}

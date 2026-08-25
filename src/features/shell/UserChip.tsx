import type { ReactElement } from 'react';
import { useAuthStore } from '../../auth/AuthStore';
import { chipLabel, splitEmail } from '../../domain/user';
import { Avatar } from '../../shared/ui/Avatar';

export function UserChip(): ReactElement | null {
  const profile = useAuthStore((state) => state.profile);
  const setSettingsOpen = useAuthStore((state) => state.setSettingsOpen);
  if (!profile) {
    return null;
  }
  const label = chipLabel(profile);
  const email = splitEmail(profile.email);
  return (
    <button type="button" className="albedo-chip" onClick={() => setSettingsOpen(true)}>
      <span className="albedo-chip-text">
        <span className="albedo-chip-name">{label}</span>
        {email ? (
          <span className="albedo-chip-email">
            {email.local}
            <span className="albedo-chip-domain">{email.domain}</span>
          </span>
        ) : null}
      </span>
      <Avatar label={label} src={profile.avatarUrl} size={32} />
    </button>
  );
}

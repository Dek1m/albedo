import type { ReactElement } from 'react';

interface AdminMenuProps {
  onOpen: () => void;
}

export function AdminMenu({ onOpen }: AdminMenuProps): ReactElement {
  return (
    <button type="button" className="albedo-ws-menu-btn" onClick={onOpen}>
      Admin Panel
    </button>
  );
}

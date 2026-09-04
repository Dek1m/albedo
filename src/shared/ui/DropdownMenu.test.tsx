import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DropdownMenu } from './DropdownMenu';

describe('DropdownMenu', () => {
  it('opens on hover and runs item', () => {
    const pick = vi.fn();
    render(
      <DropdownMenu
        label="System"
        items={[{ id: 'preferences', label: 'Preferences', onSelect: pick }]}
      />,
    );
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'System' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Preferences' }));
    expect(pick).toHaveBeenCalled();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Hint } from '../../shared/ui/Hint';

vi.mock('../../api/systemApi', () => ({
  systemApi: {
    prefList: vi.fn(async () => ({ modules: [] })),
    prefSet: vi.fn(),
  },
}));

describe('Hint', () => {
  it('renders question icon', () => {
    const { container } = render(<Hint text="Min password length" />);
    expect(container.querySelector('.albedo-hint-icon')).toBeTruthy();
    expect(screen.getByLabelText('Help')).toBeInTheDocument();
  });
});

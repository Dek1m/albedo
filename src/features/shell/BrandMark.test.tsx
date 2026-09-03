import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('exposes aria-label albedo and orange alpha', () => {
    const { container } = render(<BrandMark />);
    expect(screen.getByLabelText('albedo')).toBeInTheDocument();
    expect(container.querySelector('.albedo-brand-alpha')?.textContent).toBe('α');
    expect(screen.getByLabelText('albedo').textContent).toContain('lbedo');
  });
});

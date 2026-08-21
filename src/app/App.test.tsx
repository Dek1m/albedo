import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders root', () => {
    render(<App />);
    expect(screen.getByText('Albedo')).toBeInTheDocument();
  });
});

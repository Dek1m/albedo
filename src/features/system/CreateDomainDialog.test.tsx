import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError } from '../../api/errors';
import { domainSlugError } from './domainSlug';

vi.mock('../../shared/ui/Window', () => ({
  // Window тянет стек окон и геометрию — для теста формы достаточно пассивного контейнера.
  Window: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../api/systemApi', () => ({
  systemApi: {
    createDomain: vi.fn(),
  },
}));

import { systemApi } from '../../api/systemApi';
import { CreateDomainDialog } from './CreateDomainDialog';

const createDomain = vi.mocked(systemApi.createDomain);

describe('domainSlugError', () => {
  it('accepts lowercase slugs with dashes', () => {
    expect(domainSlugError('acme')).toBeNull();
    expect(domainSlugError('acme-corp-2')).toBeNull();
  });

  it('rejects empty, uppercase, spaces and edge dashes', () => {
    expect(domainSlugError('')).toMatch(/required/i);
    expect(domainSlugError('Acme')).not.toBeNull();
    expect(domainSlugError('acme corp')).not.toBeNull();
    expect(domainSlugError('-acme')).not.toBeNull();
    expect(domainSlugError('acme-')).not.toBeNull();
  });
});

describe('CreateDomainDialog', () => {
  beforeEach(() => {
    createDomain.mockReset();
  });

  it('submits lowercase name and display name', async () => {
    createDomain.mockResolvedValueOnce({
      id: 'dom-1',
      name: 'acme',
      displayName: 'Acme Corp',
      kind: 'domain',
      status: 'active',
      rootOuId: 'ou-1',
    });
    const onCreated = vi.fn();
    const onClose = vi.fn();
    render(<CreateDomainDialog open onClose={onClose} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'ACME' } });
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Acme Corp' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(createDomain).toHaveBeenCalledWith('acme', 'Acme Corp');
    });
    expect(onCreated).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows inline error and stays open on duplicate', async () => {
    createDomain.mockRejectedValueOnce(new ApiError('CONFLICT', 'Domain already exists'));
    const onCreated = vi.fn();
    const onClose = vi.fn();
    render(<CreateDomainDialog open onClose={onClose} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'acme' } });
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Acme' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText('Domain already exists')).toBeInTheDocument();
    });
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('validates slug before calling the backend', () => {
    render(<CreateDomainDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Not A Slug' } });
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'X' } });
    fireEvent.click(screen.getByText('Create'));

    expect(createDomain).not.toHaveBeenCalled();
    expect(screen.getByText(/lowercase letters/i)).toBeInTheDocument();
  });
});

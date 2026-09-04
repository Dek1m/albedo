import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { Dock } from './Dock';

vi.mock('../../api/llmApi', () => ({
  llmApi: { listAgents: vi.fn(async () => []), listProviders: vi.fn(async () => []) },
}));

vi.mock('../../api/workspaceApi', () => ({
  workspaceApi: { postMessage: vi.fn() },
}));

vi.mock('../../api/termApi', () => ({
  termApi: {
    listSessions: vi.fn(async () => []),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    exec: vi.fn(),
  },
}));

describe('Dock', () => {
  afterEach(() => {
    cleanup();
    useWorkspaceStore.setState({
      dockTab: 'message',
      dockHeight: 200,
      focusedSessionId: null,
      tabs: [],
      sessions: [],
    });
  });

  it('shows Message and Terminal tabs', () => {
    render(<Dock />);
    expect(screen.getByRole('tab', { name: 'Message' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Terminal' })).toBeInTheDocument();
  });

  it('has no Send button', () => {
    render(<Dock />);
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
  });

  it('keeps pipeline disabled and empty', () => {
    render(<Dock />);
    const pipeline = screen.getByLabelText('Pipeline');
    expect(pipeline).toBeDisabled();
    expect(pipeline).toHaveAttribute('title', 'Pipelines: no RPC yet');
    expect(pipeline.querySelectorAll('option')).toHaveLength(0);
  });

  it('enables terminal new session', () => {
    render(<Dock />);
    fireEvent.click(screen.getByRole('tab', { name: 'Terminal' }));
    expect(screen.getByLabelText('New session')).not.toBeDisabled();
  });
});

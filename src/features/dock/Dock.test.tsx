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

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    onResize: vi.fn(() => ({ dispose: vi.fn() })),
    write: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
    proposeDimensions: vi.fn(),
  })),
}));

vi.mock('../../api/termApi', () => ({
  termPtyUrl: vi.fn(() => 'ws://localhost/api/v1/term/pty?session_id=x'),
  termApi: {
    listSessions: vi.fn(async () => []),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { Dock } from './Dock';

vi.mock('../../api/llmApi', () => ({
  llmApi: {
    listAgents: vi.fn(async () => []),
    listProviders: vi.fn(async () => []),
    listPipelines: vi.fn(async () => []),
    cancelRun: vi.fn(async () => ({
      id: null,
      status: 'cancelled',
      tokensIn: 0,
      tokensOut: 0,
      cacheTokens: 0,
      cacheHits: 0,
    })),
    runUsage: vi.fn(async () => ({
      id: null,
      status: 'idle',
      tokensIn: 0,
      tokensOut: 0,
      cacheTokens: 0,
      cacheHits: 0,
    })),
  },
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

  it('shows Message, Terminal and Context tabs', () => {
    render(<Dock />);
    expect(screen.getByRole('tab', { name: 'Message' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Terminal' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Context' })).toBeInTheDocument();
  });

  it('shows idle loop metrics on Context', () => {
    render(<Dock />);
    fireEvent.click(screen.getByRole('tab', { name: 'Context' }));
    expect(screen.getByText('Tokens in')).toBeInTheDocument();
    expect(screen.getByText('Cache hits')).toBeInTheDocument();
  });

  it('shows composer token estimate', () => {
    render(<Dock />);
    expect(screen.getByText(/Tokens:/)).toBeInTheDocument();
  });

  it('keeps Send disabled without a session', () => {
    render(<Dock />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('keeps Message draft when switching tabs', () => {
    render(<Dock />);
    const box = document.querySelector('.albedo-md-input') as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'keep me' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Context' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Message' }));
    expect((document.querySelector('.albedo-md-input') as HTMLTextAreaElement).value).toBe('keep me');
  });

  it('has no Agent placeholder option', () => {
    render(<Dock />);
    const select = screen.getByLabelText('Agent');
    expect(select.querySelector('option[value=""]')).toBeNull();
  });

  it('keeps pipeline empty when catalog is empty', () => {
    render(<Dock />);
    const pipeline = screen.getByLabelText('Pipeline');
    expect(pipeline).toBeDisabled();
    expect(pipeline.querySelectorAll('option')).toHaveLength(0);
  });

  it('enables terminal new session', async () => {
    render(<Dock />);
    fireEvent.click(screen.getByRole('tab', { name: 'Terminal' }));
    // TerminalTab — lazy-чанк, кнопка появляется после резолва импорта.
    expect(await screen.findByLabelText('New session')).not.toBeDisabled();
  });
});

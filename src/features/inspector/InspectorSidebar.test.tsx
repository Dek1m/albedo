import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '../../workspace/WorkspaceStore';
import { ChatHud } from '../workspace/ChatHud';
import { InspectorSidebar } from './InspectorSidebar';

vi.mock('../../api/llmApi', () => ({
  llmApi: {
    listAgents: vi.fn(async () => [
      { id: 'a1', name: 'Bot', systemPrompt: 'be brief', model: 'm1' },
    ]),
    listProviders: vi.fn(async () => []),
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
  workspaceApi: {
    listMessages: vi.fn(async () => []),
  },
}));

describe('InspectorSidebar', () => {
  afterEach(() => {
    cleanup();
    useWorkspaceStore.setState({
      rightSidebarOpen: false,
      rightSidebarWidth: 320,
      rightSidebarTab: 'context',
      focusedSessionId: null,
      active: null,
    });
  });

  it('renders three tabs with Context first', () => {
    useWorkspaceStore.setState({ rightSidebarOpen: true });
    render(<InspectorSidebar />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Context', 'History', 'Tools']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('shows context metrics from the loop store', () => {
    useWorkspaceStore.setState({ rightSidebarOpen: true });
    render(<InspectorSidebar />);
    expect(screen.getByText('Tokens in')).toBeInTheDocument();
    expect(screen.getByText('Cache rate')).toBeInTheDocument();
    expect(screen.getByText('Model context')).toBeInTheDocument();
  });

  it('switches to a stub tab', () => {
    useWorkspaceStore.setState({ rightSidebarOpen: true });
    render(<InspectorSidebar />);
    fireEvent.click(screen.getByRole('tab', { name: 'History' }));
    expect(screen.getByText('Not implemented yet')).toBeInTheDocument();
  });

  it('closes via the header button', () => {
    useWorkspaceStore.setState({ rightSidebarOpen: true });
    render(<InspectorSidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }));
    expect(useWorkspaceStore.getState().rightSidebarOpen).toBe(false);
  });

  it('hud opens the inspector on the clicked tab', () => {
    render(<ChatHud />);
    fireEvent.click(screen.getByRole('button', { name: 'Context' }));
    const state = useWorkspaceStore.getState();
    expect(state.rightSidebarOpen).toBe(true);
    expect(state.rightSidebarTab).toBe('context');
  });

  it('hud opens stub tabs too', () => {
    render(<ChatHud />);
    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
    expect(useWorkspaceStore.getState().rightSidebarTab).toBe('tools');
  });

  it('hud hides while the inspector is open', () => {
    useWorkspaceStore.setState({ rightSidebarOpen: true });
    const { container } = render(<ChatHud />);
    expect(container.querySelector('.albedo-chat-hud')).toBeNull();
  });
});

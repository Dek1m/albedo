import type { ReactElement } from 'react';
import { SkeletonList } from '../../shared/ui/Skeleton';
import { Window } from '../../shared/ui/Window';
import type { AiPane } from './AiMenu';
import { ProvidersPane } from './ProvidersPane';

interface AiWindowsProps {
  pane: AiPane | null;
  onClose: () => void;
}

export function AiWindows({ pane, onClose }: AiWindowsProps): ReactElement {
  return (
    <>
      <Window className="albedo-ai-agents" windowId="albedo-ai-agents" open={pane === 'agents'} title="Agents" onClose={onClose}>
        <SkeletonList rows={6} />
      </Window>
      <Window className="albedo-ai-models" windowId="albedo-ai-models" open={pane === 'models'} title="Models" onClose={onClose}>
        <SkeletonList rows={6} />
      </Window>
      <Window
        className="albedo-ai-providers"
        windowId="albedo-ai-providers"
        open={pane === 'providers'}
        title="Providers"
        onClose={onClose}
      >
        <ProvidersPane visible={pane === 'providers'} />
      </Window>
    </>
  );
}

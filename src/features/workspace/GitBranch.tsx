import type { ReactElement } from 'react';
import type { GitRepo } from '../../api/workspaceApi';

interface GitBranchProps {
  repo: GitRepo;
  compact?: boolean;
}

export function GitBranch({ repo, compact }: GitBranchProps): ReactElement {
  const label = compact ? repo.branch : `git: ${repo.branch}`;
  const text = repo.dirty ? `${label}*` : label;
  if (!repo.url) {
    return <span className="albedo-git">{text}</span>;
  }
  return (
    <button
      type="button"
      className="albedo-git albedo-git--link"
      title={repo.url}
      onClick={(event) => {
        event.stopPropagation();
        window.open(repo.url ?? '', '_blank', 'noopener,noreferrer');
      }}
    >
      {text}
    </button>
  );
}

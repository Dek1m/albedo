import type { ReactElement } from 'react';

const SETI: Record<string, { bg: string; fg: string; mark: string }> = {
  ts: { bg: '#3178c6', fg: '#fff', mark: 'TS' },
  tsx: { bg: '#3178c6', fg: '#fff', mark: 'TX' },
  js: { bg: '#cbcb41', fg: '#1a1816', mark: 'JS' },
  jsx: { bg: '#cbcb41', fg: '#1a1816', mark: 'JX' },
  mjs: { bg: '#cbcb41', fg: '#1a1816', mark: 'JS' },
  py: { bg: '#3572a5', fg: '#fff', mark: 'PY' },
  rs: { bg: '#dea584', fg: '#1a1816', mark: 'RS' },
  go: { bg: '#00add8', fg: '#1a1816', mark: 'GO' },
  json: { bg: '#cbcb41', fg: '#1a1816', mark: '{ }' },
  md: { bg: '#519aba', fg: '#fff', mark: 'MD' },
  css: { bg: '#563d7c', fg: '#fff', mark: '#' },
  scss: { bg: '#c6538c', fg: '#fff', mark: '#' },
  html: { bg: '#e34c26', fg: '#fff', mark: '</>' },
  svg: { bg: '#ffb13b', fg: '#1a1816', mark: 'SV' },
  yml: { bg: '#cb171e', fg: '#fff', mark: 'Y' },
  yaml: { bg: '#cb171e', fg: '#fff', mark: 'Y' },
  toml: { bg: '#9c4221', fg: '#fff', mark: 'T' },
  sql: { bg: '#dad8d8', fg: '#1a1816', mark: 'Q' },
  sh: { bg: '#89e051', fg: '#1a1816', mark: '>' },
  bash: { bg: '#89e051', fg: '#1a1816', mark: '>' },
  txt: { bg: '#a0a0a0', fg: '#1a1816', mark: 'Aa' },
  env: { bg: '#6a9955', fg: '#fff', mark: 'E' },
  lock: { bg: '#a0a0a0', fg: '#1a1816', mark: 'L' },
};

interface FileGlyphProps {
  name: string;
  kind: 'folder' | 'file';
  open?: boolean;
}

export function FileGlyph({ name, kind, open }: FileGlyphProps): ReactElement {
  if (kind === 'folder') {
    return <i className={`bi ${open ? 'bi-folder2-open' : 'bi-folder'} albedo-ftype-folder`} />;
  }
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  const fallback = { bg: '#6e6e6e', fg: '#fff', mark: ext.slice(0, 2).toUpperCase() || 'F' };
  const skin = SETI[ext] ?? fallback;
  return (
    <span className="albedo-ftype" style={{ background: skin.bg, color: skin.fg }} title={ext || name}>
      {skin.mark}
    </span>
  );
}

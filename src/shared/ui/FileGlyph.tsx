import type { ReactElement } from 'react';

const ICONS: Record<string, string> = {
  folder: '/file-icons/folder.svg',
  'folder-open': '/file-icons/folder-open.svg',
  ts: '/file-icons/typescript.svg',
  tsx: '/file-icons/react_ts.svg',
  js: '/file-icons/javascript.svg',
  jsx: '/file-icons/react.svg',
  py: '/file-icons/python.svg',
  rs: '/file-icons/rust.svg',
  go: '/file-icons/go.svg',
  json: '/file-icons/json.svg',
  md: '/file-icons/markdown.svg',
  css: '/file-icons/css.svg',
  html: '/file-icons/html.svg',
  svg: '/file-icons/svg.svg',
  yml: '/file-icons/yaml.svg',
  yaml: '/file-icons/yaml.svg',
  sh: '/file-icons/console.svg',
  txt: '/file-icons/document.svg',
  file: '/file-icons/file.svg',
};

export function fileIconSrc(name: string, kind: 'folder' | 'file', open?: boolean): string {
  if (kind === 'folder') {
    return open ? ICONS['folder-open']! : ICONS.folder!;
  }
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  return ICONS[ext] ?? ICONS.file!;
}

interface FileGlyphProps {
  name: string;
  kind: 'folder' | 'file';
  open?: boolean;
}

export function FileGlyph({ name, kind, open }: FileGlyphProps): ReactElement {
  return <img className="albedo-file-glyph" src={fileIconSrc(name, kind, open)} alt="" draggable={false} />;
}

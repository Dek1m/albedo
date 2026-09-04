export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

const ALIAS: Record<string, string> = {
  javascript: 'js',
  jsx: 'js',
  typescript: 'ts',
  tsx: 'ts',
  python: 'py',
  rust: 'rs',
  golang: 'go',
  'c++': 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  csharp: 'cs',
  html: 'xml',
  yml: 'yaml',
  bash: 'sh',
  shell: 'sh',
  zsh: 'sh',
};

const KEYWORDS: Record<string, string[]> = {
  js: [
    'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'from', 'function', 'if', 'import',
    'in', 'instanceof', 'let', 'new', 'of', 'return', 'static', 'super', 'switch', 'this', 'throw',
    'try', 'typeof', 'var', 'void', 'while', 'yield', 'true', 'false', 'null', 'undefined',
  ],
  ts: [
    'type', 'interface', 'enum', 'implements', 'private', 'public', 'protected', 'readonly',
    'namespace', 'abstract', 'as', 'satisfies', 'keyof', 'infer', 'never', 'unknown', 'any',
  ],
  py: [
    'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif',
    'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while',
    'with', 'yield',
  ],
  rs: [
    'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum', 'extern',
    'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub',
    'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe',
    'use', 'where', 'while',
  ],
  go: [
    'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough', 'for',
    'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range', 'return', 'select',
    'struct', 'switch', 'type', 'var', 'nil', 'true', 'false',
  ],
  cpp: [
    'alignas', 'alignof', 'auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const',
    'constexpr', 'continue', 'default', 'delete', 'do', 'double', 'else', 'enum', 'explicit',
    'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long',
    'namespace', 'new', 'noexcept', 'nullptr', 'operator', 'private', 'protected', 'public',
    'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'template', 'this',
    'throw', 'true', 'try', 'typedef', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void',
    'volatile', 'while',
  ],
  c: ['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while'],
  java: ['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null'],
  cs: ['abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate', 'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace', 'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while'],
  sql: ['select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table', 'alter', 'drop', 'index', 'join', 'left', 'right', 'inner', 'outer', 'on', 'and', 'or', 'not', 'null', 'as', 'group', 'by', 'order', 'limit', 'offset', 'having', 'union', 'distinct', 'primary', 'key', 'foreign', 'references'],
  sh: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'in', 'function', 'return', 'exit', 'export', 'local', 'readonly', 'true', 'false'],
  yaml: ['true', 'false', 'null', 'yes', 'no'],
  json: ['true', 'false', 'null'],
};

function langId(raw: string): string {
  const key = raw.trim().toLowerCase();
  return ALIAS[key] ?? key;
}

function keywordsFor(id: string): Set<string> {
  const extra = id === 'ts' ? [...(KEYWORDS.js ?? []), ...(KEYWORDS.ts ?? [])] : (KEYWORDS[id] ?? []);
  return new Set(extra);
}

function wrap(cls: string, text: string): string {
  return `<span class="${cls}">${text}</span>`;
}

function highlightCode(source: string, lang: string): string {
  const id = langId(lang);
  const words = keywordsFor(id);
  const hashComment = id === 'py' || id === 'sh' || id === 'yaml' || id === 'sql';
  const parts: string[] = [];
  const pattern =
    id === 'xml'
      ? /(&lt;\/?[^&]*&gt;)|("[^"]*"|'[^']*')|(\d+\.?\d*)|([A-Za-z_][\w-]*)/g
      : hashComment
        ? /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\n]*"|'[^'\n]*')|(\d+\.?\d*)|([A-Za-z_][\w]*)/g
        : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|"[^"\n]*"|'[^'\n]*')|(\d+\.?\d*)|([A-Za-z_][\w]*)/g;
  let last = 0;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match) {
    if (match.index > last) {
      parts.push(source.slice(last, match.index));
    }
    const [all, comment, str, num, ident] = match;
    if (comment) {
      parts.push(wrap('md-cmt', comment));
    } else if (str) {
      parts.push(wrap('md-str', str));
    } else if (num) {
      parts.push(wrap('md-num', num));
    } else if (ident && words.has(ident)) {
      parts.push(wrap('md-kw', ident));
    } else if (id === 'xml' && ident) {
      parts.push(wrap('md-tag', ident));
    } else {
      parts.push(all);
    }
    last = match.index + all.length;
    match = pattern.exec(source);
  }
  parts.push(source.slice(last));
  return parts.join('');
}

function highlightMarkdownBody(source: string): string {
  const inlines: string[] = [];
  const withCode = source.replace(/`[^`\n]+`/g, (block) => {
    inlines.push(wrap('md-code', block));
    return `\u0000C${String(inlines.length - 1)}\u0000`;
  });
  let html = withCode
    .replace(/^#{1,6} .+$/gm, (line) => wrap('md-h', line))
    .replace(/\*\*[^*\n]+\*\*/g, (chunk) => wrap('md-b', chunk))
    .replace(/(^|[^*])\*[^*\n]+\*(?!\*)/g, (chunk) => wrap('md-i', chunk))
    .replace(/^[-*] .+$/gm, (line) => wrap('md-list', line));
  return html.replace(/\u0000C(\d+)\u0000/g, (_all, index: string) => inlines[Number(index)] ?? '');
}

export function highlightMarkdown(raw: string): string {
  const source = escapeHtml(raw);
  const fences: string[] = [];
  const withFences = source.replace(/```([^\n`]*)(\n?)([\s\S]*?)```/g, (_all, lang: string, nl: string, body: string) => {
    const inner = lang.trim() ? highlightCode(body, lang) : body;
    fences.push(`${wrap('md-fence', '```' + lang + nl)}${inner}${wrap('md-fence', '```')}`);
    return `\u0000F${String(fences.length - 1)}\u0000`;
  });
  let html = highlightMarkdownBody(withFences);
  html = html.replace(/\u0000F(\d+)\u0000/g, (_all, index: string) => fences[Number(index)] ?? '');
  return html;
}

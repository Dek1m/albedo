import { useLayoutEffect, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import { highlightMarkdown } from './markdownPrompt';

interface MarkdownPromptProps {
  value: string;
  disabled?: boolean;
  showToolbar?: boolean;
  /** Рост поля по контенту: [minRows, maxRows]. Не задан — фиксированная высота. */
  autoGrowRows?: [number, number];
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function MarkdownPrompt({
  value,
  disabled,
  showToolbar = true,
  autoGrowRows,
  onChange,
  onKeyDown,
}: MarkdownPromptProps): ReactElement {
  const fileRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Авторост: высота = контент, зажатый между min и max строками; дальше — скролл.
  useLayoutEffect(() => {
    const node = inputRef.current;
    if (!node || !autoGrowRows) {
      return;
    }
    const [minRows, maxRows] = autoGrowRows;
    const styles = window.getComputedStyle(node);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 18;
    const paddingY =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom) || 0;
    const max = maxRows * lineHeight + paddingY;
    node.style.height = 'auto';
    const next = Math.max(minRows * lineHeight + paddingY, Math.min(node.scrollHeight, max));
    node.style.height = `${next}px`;
    node.style.overflowY = node.scrollHeight > max ? 'auto' : 'hidden';
  }, [value, autoGrowRows]);

  const loadFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsText(file);
  };

  return (
    <div className={`albedo-md${autoGrowRows ? ' albedo-md--grow' : ''}`}>
      {showToolbar ? (
        <div className="albedo-md-toolbar">
          <button
            type="button"
            className="btn btn-sm albedo-ghost-btn"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            Load file
          </button>
          <button type="button" className="btn btn-sm albedo-ghost-btn" disabled={disabled} onClick={() => onChange('')}>
            Clear
          </button>
          <input
            ref={fileRef}
            className="d-none"
            type="file"
            accept=".md,.txt,text/markdown,text/plain"
            onChange={loadFile}
          />
        </div>
      ) : null}
      <div className="albedo-md-editor">
        <pre
          ref={highlightRef}
          className="albedo-md-highlight"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: highlightMarkdown(value) + '\n' }}
        />
        <textarea
          ref={inputRef}
          className="albedo-md-input"
          spellCheck={false}
          disabled={disabled}
          value={value}
          onScroll={(event) => {
            const node = highlightRef.current;
            if (node) {
              node.scrollTop = event.currentTarget.scrollTop;
              node.scrollLeft = event.currentTarget.scrollLeft;
            }
          }}
          onKeyDown={onKeyDown}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

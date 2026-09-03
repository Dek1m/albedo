import { useRef } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import { highlightMarkdown } from './markdownPrompt';

interface MarkdownPromptProps {
  value: string;
  disabled?: boolean;
  showToolbar?: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function MarkdownPrompt({
  value,
  disabled,
  showToolbar = true,
  onChange,
  onKeyDown,
}: MarkdownPromptProps): ReactElement {
  const fileRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

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
    <div className="albedo-md">
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

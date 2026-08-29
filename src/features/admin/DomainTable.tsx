import type { ChangeEvent, ReactElement } from 'react';
import type { DirectoryRow } from './domainRows';

interface DomainTableProps {
  rows: DirectoryRow[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: (keys: string[], on: boolean) => void;
  onActivate: (row: DirectoryRow) => void;
  readOnly: boolean;
}

export function DomainTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  onActivate,
  readOnly,
}: DomainTableProps): ReactElement {
  const keys = rows.map((row) => row.key);
  const allOn = keys.length > 0 && keys.every((key) => selected.has(key));

  const toggleAll = (event: ChangeEvent<HTMLInputElement>): void => {
    onToggleAll(keys, event.target.checked);
  };

  return (
    <table className="table table-sm">
      <thead>
        <tr>
          <th>
            <input
              className="form-check-input"
              type="checkbox"
              checked={allOn}
              disabled={readOnly || keys.length === 0}
              onChange={toggleAll}
              aria-label="select all visible"
            />
          </th>
          <th>UUID</th>
          <th>Name</th>
          <th>Type</th>
          <th>Extra</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const on = selected.has(row.key);
          return (
            <tr
              key={row.key}
              className={on ? 'is-selected' : undefined}
              onClick={() => onActivate(row)}
            >
              <td onClick={(event) => event.stopPropagation()}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={on}
                  disabled={readOnly}
                  onChange={() => onToggle(row.key)}
                  aria-label={`select ${row.name}`}
                />
              </td>
              <td>{row.id}</td>
              <td>{row.name}</td>
              <td>{row.type}</td>
              <td>{row.extra}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

import type { ChangeEvent, ReactElement } from 'react';
import type { DirectoryRow } from './domainRows';

interface DomainTableProps {
  rows: DirectoryRow[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: (keys: string[], on: boolean) => void;
  onActivate: (row: DirectoryRow) => void;
}

export function DomainTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  onActivate,
}: DomainTableProps): ReactElement {
  const keys = rows.map((row) => row.key);
  const allOn = keys.length > 0 && keys.every((key) => selected.has(key));
  const someOn = keys.some((key) => selected.has(key));

  const toggleAll = (event: ChangeEvent<HTMLInputElement>): void => {
    onToggleAll(keys, event.target.checked);
  };

  return (
    <table className="table table-sm table-hover">
      <thead>
        <tr>
          <th className="albedo-dir-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={allOn}
              ref={(node) => {
                if (node) {
                  node.indeterminate = someOn && !allOn;
                }
              }}
              disabled={keys.length === 0}
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
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="text-secondary text-center">
              Empty
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const on = selected.has(row.key);
            return (
              <tr
                key={row.key}
                className={on ? 'table-active is-selected' : undefined}
                onClick={() => onActivate(row)}
              >
                <td className="albedo-dir-check" onClick={(event) => event.stopPropagation()}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggle(row.key)}
                    aria-label={`select ${row.name}`}
                  />
                </td>
                <td className="albedo-dir-uuid">{row.id}</td>
                <td>{row.name}</td>
                <td>{row.type}</td>
                <td className="albedo-dir-extra">{row.extra}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

import type { ReactElement } from 'react';
import { bitOn, CRUD, entitiesForModules, toggleBit } from './roleCaps';

interface RoleCapTableProps {
  modules: Set<string>;
  mask: number;
  disabled?: boolean;
  onChange: (mask: number) => void;
}

export function RoleCapTable({ modules, mask, disabled, onChange }: RoleCapTableProps): ReactElement {
  const columns = entitiesForModules(modules);
  if (!columns.length) {
    return <p className="albedo-ai-muted">Select a module</p>;
  }
  return (
    <table className="table table-sm albedo-admin-cap-table">
      <thead>
        <tr>
          <th />
          {columns.map((column) => (
            <th key={column.id}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {CRUD.map((label, index) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            {columns.map((column) => {
              const bit = column.shift + index;
              const id = `cap-${column.id}-${label}`;
              return (
                <td key={column.id}>
                  <input
                    id={id}
                    className="form-check-input"
                    type="checkbox"
                    aria-label={`${column.label} ${label}`}
                    checked={bitOn(mask, bit)}
                    disabled={disabled}
                    onChange={() => onChange(toggleBit(mask, bit))}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

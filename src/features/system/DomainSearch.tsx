import type { ChangeEvent, ReactElement } from 'react';
import type { DomainFilterField } from './domainRows';
import { FILTER_FIELDS } from './domainRows';

interface DomainSearchProps {
  field: DomainFilterField;
  query: string;
  onField: (field: DomainFilterField) => void;
  onQuery: (query: string) => void;
}

export function DomainSearch({ field, query, onField, onQuery }: DomainSearchProps): ReactElement {
  const changeField = (event: ChangeEvent<HTMLSelectElement>): void => {
    const next = FILTER_FIELDS.find((item) => item.value === event.target.value);
    onField(next?.value ?? 'any');
  };

  return (
    <div className="albedo-admin-search albedo-ai-model-search">
      <i className="bi bi-search" aria-hidden="true" />
      <select
        className="form-select form-select-sm"
        value={field}
        onChange={changeField}
        aria-label="filter field"
      >
        {FILTER_FIELDS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <input
        className="form-control form-control-sm"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="search"
        aria-label="search directory"
      />
    </div>
  );
}

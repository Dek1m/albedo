import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { ChipDisplayMode } from '../../domain/chipDisplayMode';
import { DatePicker } from '../../shared/ui/DatePicker';
import { COUNTRIES, formatPhone, phonePayload, type Country } from '../../shared/ui/phone';
import { selectDisplayMode } from '../settings/displayMutex';

export interface DirectoryUserDraft {
  username: string;
  nickname: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  userPrompt: string;
  chipDisplayMode: ChipDisplayMode;
}

interface DirectoryUserFormProps {
  values: DirectoryUserDraft;
  onChange: (patch: Partial<DirectoryUserDraft>) => void;
  showPassword: boolean;
  password: string;
  onPassword: (value: string) => void;
  disabled: boolean;
}

export function DirectoryUserForm({
  values,
  onChange,
  showPassword,
  password,
  onPassword,
  disabled,
}: DirectoryUserFormProps): ReactElement {
  const [country, setCountry] = useState<Country>(COUNTRIES[0] as Country);
  const [phoneDisplay, setPhoneDisplay] = useState(
    values.phone ? formatPhone(values.phone, COUNTRIES[0] as Country) : '',
  );
  const hasNick = values.nickname.trim().length > 0;
  const hasFull = values.firstName.trim().length > 0 && values.lastName.trim().length > 0;

  const onPhone = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(event.target.value, country);
      setPhoneDisplay(formatted);
      onChange({ phone: phonePayload(formatted) });
    },
    [country, onChange],
  );

  return (
    <div className="albedo-settings-form">
      <label className="form-label" htmlFor="albedo-dir-username">
        Username
      </label>
      <input
        id="albedo-dir-username"
        className="form-control form-control-sm"
        autoComplete="off"
        disabled={disabled}
        value={values.username}
        onChange={(event) => onChange({ username: event.target.value })}
      />
      {showPassword ? (
        <>
          <label className="form-label" htmlFor="albedo-dir-password">
            Password
          </label>
          <input
            id="albedo-dir-password"
            className="form-control form-control-sm"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
            value={password}
            onChange={(event) => onPassword(event.target.value)}
          />
        </>
      ) : null}
      <div className="albedo-settings-row">
        <div className="flex-grow-1">
          <label className="form-label" htmlFor="albedo-dir-nickname">
            Nickname
          </label>
          <input
            id="albedo-dir-nickname"
            className="form-control form-control-sm"
            disabled={disabled}
            value={values.nickname}
            onChange={(event) => onChange({ nickname: event.target.value })}
          />
        </div>
        <label className="form-check albedo-settings-check">
          <input
            className="form-check-input"
            type="checkbox"
            disabled={disabled || !hasNick}
            checked={values.chipDisplayMode === 'nickname'}
            onChange={() => onChange({ chipDisplayMode: selectDisplayMode('nickname') })}
          />
          <span className="form-check-label">display</span>
        </label>
      </div>
      <div className="albedo-settings-row">
        <div className="flex-grow-1 d-flex gap-2">
          <div className="flex-grow-1">
            <label className="form-label" htmlFor="albedo-dir-first">
              First name
            </label>
            <input
              id="albedo-dir-first"
              className="form-control form-control-sm"
              disabled={disabled}
              value={values.firstName}
              onChange={(event) => onChange({ firstName: event.target.value })}
            />
          </div>
          <div className="flex-grow-1">
            <label className="form-label" htmlFor="albedo-dir-last">
              Last name
            </label>
            <input
              id="albedo-dir-last"
              className="form-control form-control-sm"
              disabled={disabled}
              value={values.lastName}
              onChange={(event) => onChange({ lastName: event.target.value })}
            />
          </div>
        </div>
        <label className="form-check albedo-settings-check">
          <input
            className="form-check-input"
            type="checkbox"
            disabled={disabled || !hasFull}
            checked={values.chipDisplayMode === 'full_name'}
            onChange={() => onChange({ chipDisplayMode: selectDisplayMode('full_name') })}
          />
          <span className="form-check-label">display</span>
        </label>
      </div>
      <DatePicker
        id="albedo-dir-dob"
        label="Date of birth"
        value={values.dateOfBirth}
        onChange={(iso) => onChange({ dateOfBirth: iso })}
      />
      <label className="form-label" htmlFor="albedo-dir-email">
        Email
      </label>
      <input
        id="albedo-dir-email"
        type="email"
        className="form-control form-control-sm"
        disabled={disabled}
        value={values.email}
        onChange={(event) => onChange({ email: event.target.value })}
      />
      <label className="form-label" htmlFor="albedo-dir-phone">
        Phone
      </label>
      <div className="albedo-phone-row">
        <select
          className="form-control form-control-sm albedo-phone-country"
          disabled={disabled}
          value={country.code}
          onChange={(event) => {
            const next = COUNTRIES.find((item) => item.code === event.target.value) ?? (COUNTRIES[0] as Country);
            setCountry(next);
            setPhoneDisplay('');
            onChange({ phone: '' });
          }}
        >
          {COUNTRIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.flag} {item.dial}
            </option>
          ))}
        </select>
        <input
          id="albedo-dir-phone"
          className="form-control form-control-sm"
          disabled={disabled}
          value={phoneDisplay}
          onChange={onPhone}
          placeholder={country.placeholder}
        />
      </div>
      <label className="form-label" htmlFor="albedo-dir-prompt">
        System prompt
      </label>
      <textarea
        id="albedo-dir-prompt"
        className="form-control form-control-sm"
        rows={3}
        disabled={disabled}
        value={values.userPrompt}
        onChange={(event) => onChange({ userPrompt: event.target.value })}
      />
    </div>
  );
}

export const EMPTY_DRAFT: DirectoryUserDraft = {
  username: '',
  nickname: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  userPrompt: '',
  chipDisplayMode: 'nickname',
};

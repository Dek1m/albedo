import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  label: string;
  id: string;
}

function parseDdMmYyyy(raw: string): { d: string; m: string; y: string } {
  const parts = raw.split('.');
  return { d: parts[0] ?? '', m: parts[1] ?? '', y: parts[2] ?? '' };
}

function toIso(d: string, m: string, y: string): string {
  if (d.length < 2 || m.length < 2 || y.length < 4) return '';
  const di = parseInt(d, 10);
  const mi = parseInt(m, 10);
  const yi = parseInt(y, 10);
  if (isNaN(di) || isNaN(mi) || isNaN(yi)) return '';
  if (di < 1 || di > 31 || mi < 1 || mi > 12 || yi < 1900 || yi > 2100) return '';
  const dd = String(di).padStart(2, '0');
  const mm = String(mi).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function fromIso(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}.${m}.${y}`;
}

const MONTHS: Record<string, string> = {
  '01': '01', '02': '02', '03': '03', '04': '04',
  '05': '05', '06': '06', '07': '07', '08': '08',
  '09': '09', '10': '10', '11': '11', '12': '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  may: '05', jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
  январь: '01', февраль: '02', март: '03', апрель: '04',
  май: '05', июнь: '06', июль: '07', август: '08',
  сентябрь: '09', октябрь: '10', ноябрь: '11', декабрь: '12',
};

function formatInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let d = digits.slice(0, 2);
  let m = digits.slice(2, 4);
  let y = digits.slice(4, 8);

  // Auto-complete month abbreviations
  if (m.length === 2) {
    const key = m.toLowerCase();
    if (MONTHS[key]) {
      m = MONTHS[key];
    }
  }

  let result = '';
  if (d) result = d;
  if (m) result += '.' + m;
  if (y) result += '.' + y;
  return result;
}

export function DatePicker({ value, onChange, label, id }: DatePickerProps): ReactElement {
  const [display, setDisplay] = useState(fromIso(value));
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [calYear, setCalYear] = useState(() => {
    const y = value ? parseInt(value.slice(0, 4), 10) : new Date().getFullYear();
    return isNaN(y) ? new Date().getFullYear() : y;
  });
  const [calMonth, setCalMonth] = useState(() => {
    const m = value ? parseInt(value.slice(5, 7), 10) - 1 : new Date().getMonth();
    return isNaN(m) ? 0 : m;
  });

  const commit = useCallback(
    (text: string) => {
      const { d, m, y } = parseDdMmYyyy(text);
      const iso = toIso(d, m, y);
      onChange(iso);
    },
    [onChange],
  );

  const onTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = formatInput(raw);
      setDisplay(formatted);
      const { d, m, y } = parseDdMmYyyy(formatted);
      if (d.length === 2 && m.length === 2 && y.length === 4) {
        commit(formatted);
      }
    },
    [commit],
  );

  const onTextBlur = useCallback(() => {
    commit(display);
  }, [display, commit]);

  const pickDay = (day: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const iso = `${calYear}-${mm}-${dd}`;
    setDisplay(fromIso(iso));
    onChange(iso);
    setOpen(false);
  };

  const calDays = new Date(calYear, calMonth + 1, 0).getDate();
  const calFirstDow = new Date(calYear, calMonth, 1).getDay();

  const MONTH_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="albedo-dp">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className="albedo-dp-row">
        <input
          ref={inputRef}
          id={id}
          className="form-control form-control-sm"
          value={display}
          onChange={onTextChange}
          onBlur={onTextBlur}
          placeholder="dd.mm.yyyy"
          maxLength={10}
          autoComplete="off"
        />
        <button
          type="button"
          className="btn btn-sm albedo-ghost-btn albedo-dp-btn"
          onClick={() => setOpen((v) => !v)}
          tabIndex={-1}
        >
          &#128197;
        </button>
      </div>
      {open ? (
        <div className="albedo-dp-cal">
          <div className="albedo-dp-cal-header">
            <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={() => setCalYear((y) => y - 1)}>
              &laquo;
            </button>
            <select
              className="form-control form-control-sm albedo-dp-month-select"
              value={calMonth}
              onChange={(e) => setCalMonth(Number(e.target.value))}
            >
              {MONTH_LABELS.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="form-control form-control-sm albedo-dp-year-select"
              value={calYear}
              onChange={(e) => setCalYear(Number(e.target.value))}
            >
              {Array.from({ length: 120 }, (_, i) => 2026 - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={() => setCalYear((y) => y + 1)}>
              &raquo;
            </button>
          </div>
          <div className="albedo-dp-cal-grid">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <span key={d} className="albedo-dp-cal-dow">
                {d}
              </span>
            ))}
            {Array.from({ length: calFirstDow === 0 ? 6 : calFirstDow - 1 }, (_, i) => (
              <span key={`e${i}`} />
            ))}
            {Array.from({ length: calDays }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                className={`albedo-dp-cal-day${day === parseInt(display.slice(0, 2), 10) && calMonth + 1 === parseInt(display.slice(3, 5), 10) && calYear === parseInt(display.slice(6, 10), 10) ? ' albedo-dp-cal-day--active' : ''}`}
                onClick={() => pickDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

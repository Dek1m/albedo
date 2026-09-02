const BIDI_MARK = /[\u202A-\u202E\u2066-\u2069]/g;
const VISIBLE = '\u2AF4';

export function neutralizeBidi(value: string): string {
  return value.replace(BIDI_MARK, VISIBLE);
}

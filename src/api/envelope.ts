export interface EnvelopeError {
  code: string;
  message: string;
  details?: unknown;
  status_code?: number;
}

export interface EnvelopeMeta {
  request_id?: string;
  duration_ms?: number;
}

export interface Envelope<T> {
  data: T | null;
  error: EnvelopeError | null;
  meta: EnvelopeMeta | null;
}

export function isEnvelope<T>(value: unknown): value is Envelope<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return 'data' in value && 'error' in value;
}

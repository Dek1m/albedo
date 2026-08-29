import type { EnvelopeError } from './envelope';

export class ApiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly statusCode: number;

  constructor(code: string, message: string, details?: unknown, statusCode = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

export function toApiError(error: EnvelopeError): ApiError {
  return new ApiError(error.code, error.message, error.details, error.status_code ?? 0);
}

const CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Wrong username or password',
  ACCOUNT_LOCKED: 'Account is temporarily locked. Try again later',
  LOCKED: 'Account is temporarily locked. Try again later',
  ACCOUNT_DISABLED: 'Account is disabled',
  DISABLED: 'Account is disabled',
  REUSE_DETECTED: 'Session was reused. Sign in again',
  AUTH_ERROR: 'Sign-in failed',
  PAYLOAD_NOT_SERIALIZABLE: 'Invalid request',
  TIMEOUT: 'The service did not respond. Try again',
  METHOD_NOT_FOUND: 'Method not found',
  WORKER_NOT_READY: 'Service is temporarily unavailable',
  FORBIDDEN: 'You do not have permission',
  PERMISSION_DENIED: 'You do not have permission',
  NOT_FOUND: 'Not found',
  INVALID_NAME: 'Invalid name',
  WRONG_URL: 'Wrong URL',
  PATH_ESCAPE: 'Invalid path',
  FS_ERROR: 'File operation failed',
  WORKSPACE_ERROR: 'Workspace operation failed',
  BOOTSTRAP_DONE: 'Setup is already complete',
  CSRF_HEADER: 'Request blocked. Reload the page',
  ORIGIN_MISMATCH: 'Request blocked. Reload the page',
  ALREADY_NESTED: 'This folder is already inside one added to the project',
  CONTAINS_LINKED: 'The project already has a nested folder — remove it first',
  ALREADY_LINKED: 'Already in workspace',
  ALREADY_EXISTS: 'This file already exists',
  DUPLICATE_NAME: 'A provider with this name already exists',
  TASK_FAILED: 'Something went wrong',
  LLM_ERROR: 'Something went wrong',
  UPSTREAM: 'Wrong URL',
};

function looksTechnical(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes('task_failed') ||
    t.includes('internal error') ||
    t.includes('duplicate key') ||
    t.includes('violates unique') ||
    t.includes('traceback') ||
    t.includes('psycopg') ||
    t.includes('detail:')
  );
}

export function humanMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const mapped = CODE_MESSAGES[error.code];
    if (mapped) {
      return mapped;
    }
    if (error.message && !looksTechnical(error.message)) {
      return error.message;
    }
    return 'Something went wrong';
  }
  if (error instanceof Error) {
    if (error.message && !looksTechnical(error.message)) {
      return error.message;
    }
    return 'Something went wrong';
  }
  return 'Something went wrong';
}

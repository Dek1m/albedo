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

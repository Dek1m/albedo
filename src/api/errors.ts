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
  INVALID_CREDENTIALS: 'Неверный логин или пароль',
  ACCOUNT_LOCKED: 'Аккаунт временно заблокирован. Попробуйте позже',
  ACCOUNT_DISABLED: 'Аккаунт отключён',
  AUTH_ERROR: 'Ошибка авторизации',
  PAYLOAD_NOT_SERIALIZABLE: 'Некорректный запрос',
  METHOD_NOT_FOUND: 'Метод не найден',
  WORKER_NOT_READY: 'Сервис временно недоступен',
};

export function humanMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return CODE_MESSAGES[error.code] ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}

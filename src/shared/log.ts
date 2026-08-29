type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function emit(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
  const payload = extra && Object.keys(extra).length ? extra : undefined;
  const line = payload ? `[albedo] ${message}` : `[albedo] ${message}`;
  if (level === 'error') {
    console.error(line, payload ?? '');
    return;
  }
  if (level === 'warn') {
    console.warn(line, payload ?? '');
    return;
  }
  console.info(line, payload ?? '');
}

export const log = {
  debug(message: string, extra?: Record<string, unknown>): void {
    emit('debug', message, extra);
  },
  info(message: string, extra?: Record<string, unknown>): void {
    emit('info', message, extra);
  },
  warn(message: string, extra?: Record<string, unknown>): void {
    emit('warn', message, extra);
  },
  error(message: string, extra?: Record<string, unknown>): void {
    emit('error', message, extra);
  },
};

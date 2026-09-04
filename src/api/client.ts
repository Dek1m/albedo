import { log } from '../shared/log';
import { isEnvelope } from './envelope';
import { ApiError, toApiError } from './errors';
import type { Envelope } from './envelope';

const REFRESH_LOCK = 'albedo-refresh';

export interface CallOptions {
  skipRefresh?: boolean;
  signal?: AbortSignal;
}

export class ApiClient {
  private refreshInFlight: Promise<void> | null = null;

  async call<T>(
    module: string,
    fn: string,
    kwargs: object = {},
    options: CallOptions = {},
  ): Promise<T> {
    try {
      return await this.request<T>(module, fn, kwargs, options.signal);
    } catch (error) {
      if (!this.shouldRefresh(error, fn, options.skipRefresh)) {
        throw error;
      }
      await this.refreshSingleFlight();
      return await this.request<T>(module, fn, kwargs, options.signal);
    }
  }

  private shouldRefresh(error: unknown, fn: string, skip?: boolean): boolean {
    if (skip || fn === 'refresh_token' || fn === 'login' || fn === 'logout') {
      return false;
    }
    return error instanceof ApiError && error.statusCode === 401;
  }

  private async refreshSingleFlight(): Promise<void> {
    const run = async (): Promise<void> => {
      await this.request<unknown>('auth', 'refresh_token', {});
    };
    const locks = globalThis.navigator?.locks;
    if (locks?.request) {
      await locks.request(REFRESH_LOCK, run);
      return;
    }
    if (this.refreshInFlight === null) {
      this.refreshInFlight = run().finally(() => {
        this.refreshInFlight = null;
      });
    }
    await this.refreshInFlight;
  }

  private async request<T>(
    module: string,
    fn: string,
    kwargs: object,
    signal?: AbortSignal,
  ): Promise<T> {
    const started = performance.now();
    log.info('rpc_started', { module, fn });
    let response: Response;
    try {
      response = await fetch(`/api/v1/${module}/${fn}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Albedo-Client': 'spa',
        },
        // Токены придут cookie с бэка. Не Bearer. Не sessionStorage.
        credentials: 'include',
        body: JSON.stringify(kwargs),
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('ABORTED', 'Stopped');
      }
      throw error;
    }

    let envelope: Envelope<T>;
    try {
      envelope = await this.parseEnvelope<T>(response);
    } catch (error) {
      const durationMs = Math.round(performance.now() - started);
      const err = error instanceof ApiError
        ? error
        : new ApiError('invalid_envelope', `HTTP ${String(response.status)}`, undefined, response.status);
      log.error('rpc_failed', {
        module,
        fn,
        status: response.status,
        code: err.code,
        duration_ms: durationMs,
      });
      throw err;
    }
    const durationMs = Math.round(performance.now() - started);
    if (envelope.error) {
      const err = toApiError(envelope.error);
      log.error('rpc_failed', {
        module,
        fn,
        status: response.status,
        code: err.code,
        message: err.message,
        duration_ms: durationMs,
      });
      throw err;
    }
    if (envelope.data === null) {
      log.error('rpc_failed', { module, fn, status: response.status, code: 'empty_data', duration_ms: durationMs });
      throw new ApiError('empty_data', 'RPC returned no data');
    }
    log.info('rpc_ok', { module, fn, status: response.status, duration_ms: durationMs });
    return envelope.data;
  }

  private async parseEnvelope<T>(response: Response): Promise<Envelope<T>> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('invalid_json', `HTTP ${String(response.status)}`, undefined, response.status);
    }
    if (!isEnvelope<T>(body)) {
      throw new ApiError('invalid_envelope', `HTTP ${String(response.status)}`, undefined, response.status);
    }
    return body;
  }
}

export const apiClient = new ApiClient();

import { apiClient } from './client';

export interface TermSession {
  id: string;
  title: string;
  cwd: string;
  status: string;
}

export interface TermExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export const termApi = {
  async listSessions(): Promise<TermSession[]> {
    const raw = await apiClient.call<{ items?: { id?: string; title?: string; cwd?: string; status?: string }[] }>(
      'term',
      'sessions_list',
      {},
    );
    return (raw.items ?? []).map((row) => ({
      id: String(row.id ?? ''),
      title: String(row.title ?? 'Terminal'),
      cwd: String(row.cwd ?? ''),
      status: String(row.status ?? 'idle'),
    }));
  },

  async createSession(title?: string): Promise<TermSession> {
    const row = await apiClient.call<{ id?: string; title?: string; cwd?: string; status?: string }>(
      'term',
      'session_create',
      { title: title ?? null },
    );
    return {
      id: String(row.id ?? ''),
      title: String(row.title ?? 'Terminal'),
      cwd: String(row.cwd ?? ''),
      status: String(row.status ?? 'idle'),
    };
  },

  async deleteSession(sessionId: string): Promise<void> {
    await apiClient.call('term', 'session_delete', { session_id: sessionId });
  },

  async exec(sessionId: string, command: string): Promise<TermExecResult> {
    const row = await apiClient.call<{ stdout?: string; stderr?: string; exit_code?: number }>(
      'term',
      'exec',
      { session_id: sessionId, command },
    );
    return {
      stdout: String(row.stdout ?? ''),
      stderr: String(row.stderr ?? ''),
      exitCode: Number(row.exit_code ?? 0),
    };
  },
};

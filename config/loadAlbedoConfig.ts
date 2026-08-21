import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AlbedoConfig {
  listenHost: string;
  listenPort: number;
  apiUrl: string;
}

export interface LoadAlbedoConfigOptions {
  env?: Record<string, string | undefined>;
  confPath?: string;
  dotenvPath?: string;
}

const DEFAULTS = {
  listenHost: 'localhost',
  listenPort: 5173,
  apiUrl: 'http://127.0.0.1:8080',
} as const;

const CONFIG_DIR = dirname(fileURLToPath(import.meta.url));

export function parseKeyValue(text: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }
    const eq = line.indexOf('=');
    parsed[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return parsed;
}

function readKeyValueFile(path: string): Record<string, string> {
  try {
    return parseKeyValue(readFileSync(path, 'utf8'));
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function pick(
  key: string,
  layers: ReadonlyArray<Record<string, string | undefined>>,
  fallback: string,
): string {
  for (const layer of layers) {
    const value = layer[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }
  return fallback;
}

export function resolveAlbedoConfig(
  env: Record<string, string | undefined>,
  file: Record<string, string>,
): AlbedoConfig {
  const rawPort = pick('ALBEDO_LISTEN_PORT', [env, file], String(DEFAULTS.listenPort));
  const listenPort = Number(rawPort);
  if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65535) {
    throw new Error(`Invalid ALBEDO_LISTEN_PORT: ${rawPort}`);
  }
  return {
    listenHost: pick('ALBEDO_LISTEN_HOST', [env, file], DEFAULTS.listenHost),
    listenPort,
    apiUrl: pick('ALBEDO_API_URL', [env, file], DEFAULTS.apiUrl),
  };
}

export function loadAlbedoConfig(options: LoadAlbedoConfigOptions = {}): AlbedoConfig {
  const env = options.env ?? process.env;
  const file = readKeyValueFile(options.confPath ?? join(CONFIG_DIR, 'albedo.conf'));
  // .env — локальный слой ENV, не перекрывает уже заданные переменные процесса
  const dotenv = readKeyValueFile(options.dotenvPath ?? join(CONFIG_DIR, '..', '.env'));
  return resolveAlbedoConfig({ ...dotenv, ...env }, file);
}

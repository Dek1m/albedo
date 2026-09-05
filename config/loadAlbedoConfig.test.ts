import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadAlbedoConfig, parseKeyValue, resolveAlbedoConfig } from './loadAlbedoConfig.ts';

describe('parseKeyValue', () => {
  it('skips comments, blanks and lines without equals', () => {
    expect(
      parseKeyValue('# c\n\nNOVALUE\n ALBEDO_LISTEN_HOST = example \nALBEDO_LISTEN_PORT=1'),
    ).toEqual({
      ALBEDO_LISTEN_HOST: 'example',
      ALBEDO_LISTEN_PORT: '1',
    });
  });
});

describe('resolveAlbedoConfig', () => {
  it('uses hardcoded defaults', () => {
    expect(resolveAlbedoConfig({}, {})).toEqual({
      listenHost: 'localhost',
      listenPort: 5173,
      apiUrl: 'http://127.0.0.1:8080',
    });
  });

  it('prefers ENV over file', () => {
    expect(
      resolveAlbedoConfig(
        { ALBEDO_LISTEN_PORT: '4000', ALBEDO_API_URL: 'http://upstream:9' },
        { ALBEDO_LISTEN_HOST: 'from-file', ALBEDO_LISTEN_PORT: '1', ALBEDO_API_URL: 'http://file' },
      ),
    ).toEqual({
      listenHost: 'from-file',
      listenPort: 4000,
      apiUrl: 'http://upstream:9',
    });
  });

  it('rejects a non-integer port', () => {
    expect(() => resolveAlbedoConfig({ ALBEDO_LISTEN_PORT: 'nope' }, {})).toThrow(
      'Invalid ALBEDO_LISTEN_PORT: nope',
    );
  });
});

describe('loadAlbedoConfig', () => {
  // Герметично: свой conf в tmp, репозиторный config/albedo.conf не читается.
  const dir = mkdtempSync(join(tmpdir(), 'albedo-conf-'));
  const confPath = join(dir, 'albedo.conf');
  const missing = join(dir, 'missing');

  it('reads values from the given conf file', () => {
    writeFileSync(
      confPath,
      '# test\nALBEDO_LISTEN_HOST=0.0.0.0\nALBEDO_LISTEN_PORT=9999\nALBEDO_API_URL=http://belle:8080\n',
    );
    expect(loadAlbedoConfig({ env: {}, confPath, dotenvPath: missing })).toEqual({
      listenHost: '0.0.0.0',
      listenPort: 9999,
      apiUrl: 'http://belle:8080',
    });
  });

  it('falls back to defaults when the conf file is missing', () => {
    expect(loadAlbedoConfig({ env: {}, confPath: missing, dotenvPath: missing })).toEqual({
      listenHost: 'localhost',
      listenPort: 5173,
      apiUrl: 'http://127.0.0.1:8080',
    });
  });

  it('prefers env over the conf file', () => {
    writeFileSync(confPath, 'ALBEDO_LISTEN_PORT=9999\n');
    expect(
      loadAlbedoConfig({ env: { ALBEDO_LISTEN_PORT: '4321' }, confPath, dotenvPath: missing }),
    ).toMatchObject({ listenPort: 4321 });
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });
});

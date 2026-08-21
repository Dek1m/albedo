import { describe, expect, it } from 'vitest';
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
  it('reads repo albedo.conf when env is empty', () => {
    expect(
      loadAlbedoConfig({
        env: {},
        dotenvPath: '/tmp/albedo-missing.env',
      }),
    ).toEqual({
      listenHost: 'localhost',
      listenPort: 5173,
      apiUrl: 'http://127.0.0.1:8080',
    });
  });
});

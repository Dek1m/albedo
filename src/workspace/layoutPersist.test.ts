import { afterEach, describe, expect, it } from 'vitest';
import { readLayout, writeLayout } from './layoutPersist';

describe('layoutPersist', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('roundtrips dockHeight and keeps sidebarWidth', () => {
    writeLayout('u1', {
      workspaceId: 'ws',
      focusedSessionId: null,
      openSessionIds: [],
      foldersOpen: true,
      sidebarWidth: 300,
      dockHeight: 240,
      rightSidebarWidth: 360,
      expandedByWs: {},
    });
    const got = readLayout('u1');
    expect(got?.sidebarWidth).toBe(300);
    expect(got?.dockHeight).toBe(240);
    expect(got?.rightSidebarWidth).toBe(360);
    expect(got?.workspaceId).toBe('ws');
  });

  it('defaults dockHeight when missing', () => {
    localStorage.setItem(
      'albedo.layout.u2',
      JSON.stringify({
        workspaceId: null,
        focusedSessionId: null,
        openSessionIds: [],
        foldersOpen: true,
        sidebarWidth: 240,
        expandedByWs: {},
      }),
    );
    expect(readLayout('u2')?.dockHeight).toBe(200);
    // Старый layout без инспектора получает дефолтную ширину.
    expect(readLayout('u2')?.rightSidebarWidth).toBe(320);
  });
});

import { describe, expect, it } from 'vitest';
import { badgeLabel, formatNotificationText } from './notificationText';

describe('formatNotificationText', () => {
  it('formats share_grant as text', () => {
    expect(
      formatNotificationText('share_grant', {
        actor_name: 'anna',
        node_name: 'Отчёты',
        node_kind: 'dir',
      }),
    ).toBe('Пользователь anna предоставил вам доступ к папке «Отчёты»');
  });

  it('uses file wording', () => {
    expect(
      formatNotificationText('share_grant', { actor_name: 'ivan', node_name: 'a.txt', node_kind: 'file' }),
    ).toBe('Пользователь ivan предоставил вам доступ к файлу «a.txt»');
  });

  it('falls back without reading unknown payload fields', () => {
    expect(formatNotificationText('other', { node_uuid: 'x' })).toBe('Уведомление: other');
  });

  it('neutralizes bidi in names', () => {
    const text = formatNotificationText('share_grant', {
      actor_name: 'a\u202E',
      node_name: 'b',
      node_kind: 'dir',
    });
    expect(text.includes('\u202E')).toBe(false);
    expect(text.includes('\u2AF4')).toBe(true);
  });
});

describe('badgeLabel', () => {
  it('hides zero', () => {
    expect(badgeLabel(0)).toBeNull();
  });

  it('caps at 99+', () => {
    expect(badgeLabel(1)).toBe('1');
    expect(badgeLabel(99)).toBe('99');
    expect(badgeLabel(150)).toBe('99+');
  });
});

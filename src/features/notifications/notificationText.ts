import { neutralizeBidi } from '../../shared/ui/neutralizeBidi';

export function payloadString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

export function formatNotificationText(type: string, payload: Record<string, unknown>): string {
  if (type !== 'share_grant') {
    return `Уведомление: ${type}`;
  }
  const actor = neutralizeBidi(payloadString(payload, 'actor_name'));
  const node = neutralizeBidi(payloadString(payload, 'node_name'));
  const what = payload.node_kind === 'file' ? 'файлу' : 'папке';
  return `Пользователь ${actor} предоставил вам доступ к ${what} «${node}»`;
}

export function badgeLabel(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count > 99 ? '99+' : String(count);
}

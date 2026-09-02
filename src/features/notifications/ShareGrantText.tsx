import type { ReactElement } from 'react';
import { SafeName } from '../../shared/ui/SafeName';
import { payloadString } from './notificationText';

export function ShareGrantText({
  type,
  payload,
}: {
  type: string;
  payload: Record<string, unknown>;
}): ReactElement {
  if (type !== 'share_grant') {
    return <>Уведомление: {type}</>;
  }
  const what = payload.node_kind === 'file' ? 'файлу' : 'папке';
  return (
    <>
      Пользователь <SafeName value={payloadString(payload, 'actor_name')} /> предоставил вам доступ к{' '}
      {what} «<SafeName value={payloadString(payload, 'node_name')} />»
    </>
  );
}

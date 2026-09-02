import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, UIEvent } from 'react';
import { notificationApi } from '../../api/notificationApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { useClickOutside } from '../../shared/ui/useClickOutside';
import { ShareGrantText } from './ShareGrantText';
import { startNotificationPoller } from './notificationPoller';
import { useNotificationStore } from './notificationStore';
import { badgeLabel } from './notificationText';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationBell(): ReactElement {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const items = useNotificationStore((state) => state.items);
  const nextCursor = useNotificationStore((state) => state.nextCursor);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => startNotificationPoller(), []);
  useClickOutside(open, wrap, close);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const loadFirst = async (): Promise<void> => {
    setLoading(true);
    try {
      const page = await notificationApi.list(50);
      useNotificationStore.getState().replacePage(page.items, page.nextCursor);
    } catch (err) {
      toast(humanMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onToggle = (): void => {
    const next = !open;
    setOpen(next);
    if (next) {
      void loadFirst();
    }
  };

  const onScroll = (event: UIEvent<HTMLDivElement>): void => {
    const node = event.currentTarget;
    if (!nextCursor || loading) {
      return;
    }
    if (node.scrollTop + node.clientHeight < node.scrollHeight - 24) {
      return;
    }
    setLoading(true);
    void notificationApi
      .list(50, nextCursor)
      .then((page) => useNotificationStore.getState().appendPage(page.items, page.nextCursor))
      .catch((err: unknown) => toast(humanMessage(err)))
      .finally(() => setLoading(false));
  };

  const onItem = async (id: string, readAt: string | null): Promise<void> => {
    if (readAt) {
      return;
    }
    try {
      await notificationApi.markRead(id);
      useNotificationStore.getState().markReadLocal(id);
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const onReadAll = async (): Promise<void> => {
    try {
      await notificationApi.markAllRead();
      useNotificationStore.getState().markAllReadLocal();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const badge = badgeLabel(unreadCount);
  const icon = unreadCount > 0 ? 'bi-bell-fill' : 'bi-bell';

  return (
    <div className="albedo-bell" ref={wrap}>
      <button
        type="button"
        className="albedo-bell-btn"
        aria-label="Уведомления"
        aria-expanded={open}
        onClick={onToggle}
      >
        <i className={`bi ${icon}`} />
        {badge ? <span className="albedo-bell-badge">{badge}</span> : null}
      </button>
      {open ? (
        <div className="albedo-bell-drop" role="dialog" aria-label="Уведомления">
          <div className="albedo-bell-head">
            <span>Уведомления</span>
            <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={() => void onReadAll()}>
              Прочитать все
            </button>
          </div>
          <div className="albedo-bell-list" onScroll={onScroll}>
            {items.length === 0 && !loading ? (
              <p className="albedo-bell-empty">Нет уведомлений</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`albedo-bell-item${item.readAt ? '' : ' is-unread'}`}
                  onClick={() => void onItem(item.id, item.readAt)}
                >
                  <span className="albedo-bell-item-text">
                    <ShareGrantText type={item.type} payload={item.payload} />
                  </span>
                  <span className="albedo-bell-item-meta">
                    {!item.readAt ? <span className="albedo-bell-dot" aria-hidden="true" /> : null}
                    <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

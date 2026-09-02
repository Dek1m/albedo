import { apiClient } from './client';

export interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface NotificationDto {
  id: string;
  type: string;
  payload?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
}

function toItem(dto: NotificationDto): NotificationItem {
  return {
    id: dto.id,
    type: dto.type,
    payload: dto.payload ?? {},
    readAt: dto.read_at ?? null,
    createdAt: dto.created_at,
  };
}

export const notificationApi = {
  async list(limit = 50, cursor?: string | null): Promise<{
    items: NotificationItem[];
    nextCursor: string | null;
  }> {
    const result = await apiClient.call<{ items?: NotificationDto[]; next_cursor?: string | null }>(
      'notification',
      'list',
      {
        limit,
        ...(cursor ? { cursor } : {}),
      },
    );
    return {
      items: (result.items ?? []).map(toItem),
      nextCursor: result.next_cursor ?? null,
    };
  },

  async unreadCount(): Promise<number> {
    const result = await apiClient.call<{ count?: number }>('notification', 'list_unread_count', {});
    return result.count ?? 0;
  },

  async markRead(id: string): Promise<boolean> {
    const result = await apiClient.call<{ marked?: boolean }>('notification', 'mark_read', { id });
    return Boolean(result.marked);
  },

  async markAllRead(): Promise<number> {
    const result = await apiClient.call<{ marked?: number }>('notification', 'mark_all_read', {});
    return result.marked ?? 0;
  },
};

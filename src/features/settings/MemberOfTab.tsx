import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { addMembership } from '../../application/groups/addMembership';
import { loadMyGroups } from '../../application/groups/loadMyGroups';
import { removeMembership } from '../../application/groups/removeMembership';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../auth/AuthStore';
import { canRemove, removeBlockedReason } from '../../domain/group';
import type { Group } from '../../domain/group';

export function MemberOfTab(): ReactElement | null {
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [addId, setAddId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mine = useQuery({ queryKey: ['auth', 'groups'], queryFn: loadMyGroups });
  const catalog = useQuery({ queryKey: ['auth', 'groups', 'all'], queryFn: () => authApi.listGroups() });

  if (!profile) {
    return null;
  }

  const mineIds = new Set((mine.data ?? []).map((group) => group.id));
  const available = (catalog.data ?? []).filter((group) => !mineIds.has(group.id));
  const selectedGroup: Group | undefined = (mine.data ?? []).find((group) => group.id === selected);
  const blocked = selectedGroup ? removeBlockedReason(profile, selectedGroup) : 'Выберите группу';
  const allowRemove = Boolean(selectedGroup && canRemove(profile, selectedGroup));

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['auth', 'groups'] });
  };

  const onAdd = async (): Promise<void> => {
    if (!addId) {
      return;
    }
    setError(null);
    try {
      await addMembership(addId);
      setAddId('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить');
    }
  };

  const onRemove = async (): Promise<void> => {
    if (!selectedGroup || !allowRemove) {
      return;
    }
    setError(null);
    try {
      await removeMembership(selectedGroup.id);
      setSelected(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить');
    }
  };

  return (
    <div className="albedo-member-of">
      <ul className="list-group">
        {(mine.data ?? []).map((group) => (
          <li
            key={group.id}
            className={`list-group-item${selected === group.id ? ' active' : ''}`}
            onClick={() => setSelected(group.id)}
          >
            <span>{group.name}</span>
            {group.isPrimary ? <span className="albedo-badge">primary</span> : null}
          </li>
        ))}
      </ul>

      <div className="albedo-member-actions">
        <select
          className="form-control"
          value={addId}
          onChange={(event) => setAddId(event.target.value)}
        >
          <option value="">Добавить группу…</option>
          {available.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-albedo-primary" onClick={() => void onAdd()} disabled={!addId}>
          Add
        </button>
        <button
          type="button"
          className="btn albedo-ghost-btn"
          onClick={() => void onRemove()}
          disabled={!allowRemove}
          title={blocked ?? undefined}
        >
          Remove
        </button>
      </div>
      {error ? <p className="albedo-auth-error">{error}</p> : null}
    </div>
  );
}

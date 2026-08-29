import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { adminApi } from '../../api/adminApi';
import type { UserGroup } from '../../api/adminApi';
import { authApi } from '../../api/authApi';
import { humanMessage } from '../../api/errors';
import type { Group } from '../../domain/group';
import { toast } from '../../shared/toast/toastStore';

interface DirectoryMemberOfProps {
  userId: string;
}

export function DirectoryMemberOf({ userId }: DirectoryMemberOfProps): ReactElement {
  const [mine, setMine] = useState<UserGroup[]>([]);
  const [catalog, setCatalog] = useState<Group[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [addId, setAddId] = useState('');

  const load = async (): Promise<void> => {
    try {
      const [groups, all] = await Promise.all([adminApi.listUserGroups(userId), authApi.listGroups()]);
      setMine(groups);
      setCatalog(all);
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  useEffect(() => {
    void load();
  }, [userId]);

  const mineIds = new Set(mine.map((group) => group.id));
  const available = catalog.filter((group) => !mineIds.has(group.id) && group.name !== 'Everyone');
  const current = mine.find((group) => group.id === selected);

  const onAdd = async (): Promise<void> => {
    if (!addId) {
      return;
    }
    try {
      await authApi.addToGroup(addId, userId);
      setAddId('');
      await load();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  const onRemove = async (): Promise<void> => {
    if (!current || current.isPrimary) {
      return;
    }
    try {
      await authApi.removeFromGroup(current.id, userId);
      setSelected(null);
      await load();
    } catch (err) {
      toast(humanMessage(err));
    }
  };

  return (
    <div className="albedo-member-of">
      <ul className="list-group">
        {mine.map((group) => (
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
        <select className="form-control form-control-sm" value={addId} onChange={(event) => setAddId(event.target.value)}>
          <option value="">Add group…</option>
          {available.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-sm btn-albedo-primary" disabled={!addId} onClick={() => void onAdd()}>
          Add
        </button>
        <button
          type="button"
          className="btn btn-sm albedo-ghost-btn"
          disabled={!current || current.isPrimary}
          onClick={() => void onRemove()}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

import type { ChatMessage } from '../../domain/workspace';

function byTime(a: ChatMessage, b: ChatMessage): number {
  const delta = a.createdAt.localeCompare(b.createdAt);
  return delta !== 0 ? delta : a.id.localeCompare(b.id);
}

export function withParents(messages: ChatMessage[]): ChatMessage[] {
  const legacy = messages.filter((item) => !item.parentId).sort(byTime);
  const inferred = new Map<string, string | null>();
  legacy.forEach((item, index) => {
    const prev = index > 0 ? legacy[index - 1] : undefined;
    inferred.set(item.id, prev ? prev.id : null);
  });
  return messages.map((item) => ({
    ...item,
    parentId: item.parentId ?? inferred.get(item.id) ?? null,
  }));
}

export function childrenOf(messages: ChatMessage[], parentId: string | null): ChatMessage[] {
  return messages.filter((item) => (item.parentId ?? null) === parentId).sort(byTime);
}

export function siblingsOf(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return childrenOf(messages, message.parentId).filter((item) => item.role === message.role);
}

export function visiblePath(messages: ChatMessage[], active: Record<string, string>): ChatMessage[] {
  const tree = withParents(messages);
  const path: ChatMessage[] = [];
  let parent: string | null = null;
  for (;;) {
    const kids = childrenOf(tree, parent);
    if (!kids.length) {
      break;
    }
    const key: string = parent ?? '';
    const picked = kids.find((item) => item.id === active[key]);
    const last = kids[kids.length - 1];
    if (!last) {
      break;
    }
    const chosen = picked ?? last;
    path.push(chosen);
    parent = chosen.id;
  }
  return path;
}

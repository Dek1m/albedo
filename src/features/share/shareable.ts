export function isOwnShareablePath(
  relPath: string,
  flags?: { linked?: boolean; inherited?: boolean; excluded?: boolean },
): boolean {
  if (!relPath || flags?.excluded) {
    return false;
  }
  return Boolean(flags?.linked || flags?.inherited);
}

export function isEveryoneGrant(name: string, type: string): boolean {
  return type === 'group' && name === 'Everyone';
}

export const EVERYONE_CONFIRM =
  'Папка станет доступна всем пользователям. Они увидят ваше имя и имя папки.';

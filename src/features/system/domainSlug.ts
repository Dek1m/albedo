/** Валидация слага домена: lowercase латиница/цифры с одиночными дефисами внутри. */
export function domainSlugError(value: string): string | null {
  const slug = value.trim();
  if (!slug) {
    return 'Name is required';
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return 'Use lowercase letters, digits and dashes';
  }
  return null;
}
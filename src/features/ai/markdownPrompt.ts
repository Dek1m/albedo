export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function highlightMarkdown(raw: string): string {
  const source = escapeHtml(raw);
  const fences: string[] = [];
  const withFences = source.replace(/```[\s\S]*?```/g, (block) => {
    fences.push(`<span class="md-fence">${block}</span>`);
    return `\u0000F${String(fences.length - 1)}\u0000`;
  });
  const inlines: string[] = [];
  const withCode = withFences.replace(/`[^`\n]+`/g, (block) => {
    inlines.push(`<span class="md-code">${block}</span>`);
    return `\u0000C${String(inlines.length - 1)}\u0000`;
  });
  let html = withCode
    .replace(/^#{1,6} .+$/gm, (line) => `<span class="md-h">${line}</span>`)
    .replace(/\*\*[^*\n]+\*\*/g, (chunk) => `<span class="md-b">${chunk}</span>`)
    .replace(/(^|[^*])\*[^*\n]+\*(?!\*)/g, (chunk) => `<span class="md-i">${chunk}</span>`)
    .replace(/^[-*] .+$/gm, (line) => `<span class="md-list">${line}</span>`);
  html = html.replace(/\u0000C(\d+)\u0000/g, (_all, index: string) => inlines[Number(index)] ?? '');
  html = html.replace(/\u0000F(\d+)\u0000/g, (_all, index: string) => fences[Number(index)] ?? '');
  return html;
}

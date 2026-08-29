const MAX_BYTES = 256 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function readImageFile(file: File): Promise<{ imageB64: string; contentType: string }> {
  if (!ALLOWED.has(file.type) || file.type === 'image/svg+xml') {
    throw new Error('JPEG, PNG or WebP only');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Avatar must be 256 KiB or smaller');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return { imageB64: btoa(binary), contentType: file.type };
}

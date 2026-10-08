/** Upload rules shared by the browser (early feedback) and the server (the real enforcement). */
// Vercel Functions cap request bodies at 4.5 MB, so each file stays safely below that.
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 5;

export const UPLOAD_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  csv: 'text/csv',
} as const;
export type UploadExt = keyof typeof UPLOAD_TYPES;
export const ALLOWED_EXTENSIONS = Object.keys(UPLOAD_TYPES) as UploadExt[];
/** Text formats have no magic bytes; the server validates their content instead. */
export const TEXT_EXTENSIONS: UploadExt[] = ['txt', 'csv'];

export const extensionOf = (name: string): string =>
  name.includes('.') ? (name.split('.').pop() ?? '').toLowerCase() : '';

export function checkFileClientSide(file: { name: string; size: number }): string | null {
  const ext = extensionOf(file.name);
  if (!(ext in UPLOAD_TYPES))
    return `${file.name}: this file type is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`;
  if (file.size === 0) return `${file.name}: the file is empty.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name}: larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  return null;
}

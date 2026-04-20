const HTTP_URL_REGEX = /^https?:\/\//i;

function dedupeUploadsSegments(value: string) {
  return value.replace(/\/uploads\/uploads(?=\/|$)/gi, "/uploads");
}

/**
 * Creates a consistent absolute URL for stored files.
 * Handles absolute input URLs and prevents duplicated `/uploads/uploads/...`.
 */
export function resolveFileUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;

  const input = String(rawUrl).trim();
  if (!input) return null;
  if (!HTTP_URL_REGEX.test(input)) return null;
  return dedupeUploadsSegments(input);
}

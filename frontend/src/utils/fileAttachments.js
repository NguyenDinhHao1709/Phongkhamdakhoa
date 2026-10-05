export function parseAttachmentUrls(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // Legacy values are stored as a single URL.
  }

  return [value];
}

export function toAttachmentUrl(value) {
  return value?.startsWith('http') ? value : `http://localhost:5000${value}`;
}

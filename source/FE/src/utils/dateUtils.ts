/**
 * Parse a datetime string returned from the backend (FastAPI / SQLAlchemy).
 *
 * The backend uses Python's `datetime.isoformat()` which produces naive UTC
 * strings like "2026-04-14T07:09:00" — without a timezone suffix.
 * JavaScript's Date constructor treats such strings as *local* time, causing
 * a 7-hour offset for Vietnam (UTC+7).
 *
 * This helper appends "Z" when no timezone info is present so the string is
 * always parsed as UTC, then converted to the browser's local timezone on display.
 */
export function parseBackendDate(str: string | null | undefined): Date {
  if (!str) return new Date(NaN);
  const normalized =
    str.endsWith('Z') || str.includes('+') ? str : str + 'Z';
  return new Date(normalized);
}

/**
 * Format a backend datetime string to a localised date-only string.
 * e.g. "14/04/2026" (vi-VN)
 */
export function formatBackendDate(
  str: string | null | undefined,
  locale = 'vi-VN',
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
  const d = parseBackendDate(str);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, options);
}

/**
 * Format a backend datetime string to a localised date + time string.
 * e.g. "14:09 14/04/2026" (vi-VN)
 */
export function formatBackendDateTime(
  str: string | null | undefined,
  locale = 'vi-VN',
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  const d = parseBackendDate(str);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale, options);
}

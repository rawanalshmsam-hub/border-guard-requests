// Arabic, Gregorian calendar (e.g. "١٠ ديسمبر ٢٠٢٦")
const DATE_FMT = new Intl.DateTimeFormat('ar-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
const DAY_MONTH_FMT = new Intl.DateTimeFormat('ar-u-ca-gregory', { day: 'numeric', month: 'long' });
const TIME_FMT = new Intl.DateTimeFormat('ar-u-ca-gregory', { hour: 'numeric', minute: '2-digit' });
const MONTH_FMT = new Intl.DateTimeFormat('ar-u-ca-gregory', { month: 'long', year: 'numeric' });

/** "2026-12-10" -> local Date (no timezone shift) */
export function parseDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const formatDate = (iso) => (iso ? DATE_FMT.format(parseDate(iso)) : '');

export function formatDateRange(from, to) {
  if (!from) return '';
  if (!to || from === to) return formatDate(from);
  return `${DAY_MONTH_FMT.format(parseDate(from))} - ${formatDate(to)}`;
}

/** Full timestamp -> "اليوم ٩:٤٠ ص" or "١٠ ديسمبر ٢٠٢٦ ٩:٤٠ ص" */
export function formatDateTime(value) {
  const d = new Date(value);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? `اليوم ${TIME_FMT.format(d)}` : `${DATE_FMT.format(d)} ${TIME_FMT.format(d)}`;
}

export const formatMonth = (year, month) => MONTH_FMT.format(new Date(year, month - 1, 1));

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
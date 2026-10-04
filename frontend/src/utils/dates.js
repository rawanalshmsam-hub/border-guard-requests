export const DATE_ORDER_ERROR = 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية أو مساوياً له';

// Number of days, counting both ends: 10 → 12 Dec = 3 days
export function daysBetween(from, to) {
  const ms = new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`);
  return Math.round(ms / 86400000) + 1;
}

// Correct Arabic form of "N days"
export function daysLabel(n) {
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومان';
  if (n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
}
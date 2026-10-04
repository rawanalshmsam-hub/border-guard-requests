
import { Box, Typography } from '@mui/material';
import { formatMonth } from '../utils/format';

const WEEK_DAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];   // Sunday ... Saturday
const pad = (n) => String(n).padStart(2, '0');

/** Month grid from the calendar API (Home 4.6). Leaders also see days below the manning minimum. */
export default function MiniCalendar({ data }) {
  const { year, month, days_in_month: days, first_weekday: offset, events, manning } = data;
  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const iso = (d) => `${year}-${pad(month)}-${pad(d)}`;
  const hasEvent = (d) => events.some((e) => e.date_from <= iso(d) && iso(d) <= e.date_to);
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <Box>
      <Typography fontWeight={700} sx={{ mb: 1.5 }}>{formatMonth(year, month)}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, textAlign: 'center' }}>
        {WEEK_DAYS.map((d) => (
          <Typography key={d} variant="caption" color="text.secondary" fontWeight={700}>{d}</Typography>
        ))}
        {cells.map((d, i) => {
          if (!d) return <Box key={`blank-${i}`} />;
          const isToday = isThisMonth && today.getDate() === d;
          const below = manning?.days?.[iso(d)]?.below_minimum;
          return (
            <Box key={d} sx={{
              position: 'relative', py: 0.75, borderRadius: 2, fontSize: 13, fontWeight: isToday ? 800 : 500,
              bgcolor: isToday ? 'primary.main' : below ? '#fdecec' : 'transparent',
              color: isToday ? '#fff' : below ? '#c62828' : 'text.primary',
            }}>
              {d}
              {hasEvent(d) && (
                <Box sx={{ position: 'absolute', bottom: 2, left: 0, right: 0, mx: 'auto', width: 4, height: 4,
                           borderRadius: '50%', bgcolor: isToday ? '#fff' : 'primary.main' }} />
              )}
            </Box>
          );
        })}
      </Box>
      {manning && (
        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.5, color: '#c62828' }}>
          <Box component="span" sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: '#fdecec', border: '1px solid #f5c2c2' }} />
          أيام أقل من الحد الأدنى للتواجد ({manning.site_name})
        </Typography>
      )}
    </Box>
  );
}
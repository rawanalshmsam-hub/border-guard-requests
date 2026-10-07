import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, ButtonBase, Card, CardContent, Chip, IconButton, Skeleton, Stack, Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import useApi from '../hooks/useApi';
import SectionTitle from '../components/SectionTitle';
import { eventColor, eventShortLabel, eventTitle, eventsOnDay } from '../utils/events';
import { formatDateRange, formatMonth } from '../utils/format';

// Calendar 4.2 — type filter (the last four have no data source yet)
const TYPES = [
  { value: 'all', label: 'الكل' },
  { value: 'leave', label: 'الإجازات' },
  { value: 'return', label: 'مواعيد العودة' },
  { value: 'shift', label: 'المناوبات' },
  { value: 'course', label: 'الدورات' },
  { value: 'mission', label: 'المهام' },
  { value: 'medical', label: 'الطبية' },
];
const NOT_CONNECTED = ['shift', 'course', 'mission', 'medical'];
const WEEK_DAYS = [
  ['الأحد', 'ح'], ['الاثنين', 'ن'], ['الثلاثاء', 'ث'], ['الأربعاء', 'ر'], ['الخميس', 'خ'], ['الجمعة', 'ج'], ['السبت', 'س'],
];
const DAY_FMT = new Intl.DateTimeFormat('ar-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const pad = (n) => String(n).padStart(2, '0');
const isoOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function DayCell({ day, events, manningDay, total, isToday, isSelected, onClick }) {
  const below = manningDay?.below_minimum;
  return (
    <ButtonBase onClick={onClick} sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start',
      minHeight: { xs: 52, md: 96 }, p: 0.75, borderRadius: 2, textAlign: 'start', border: '1px solid',
      borderColor: isSelected ? 'primary.main' : below ? '#f5c2c2' : 'divider',
      bgcolor: below ? '#fff5f5' : 'background.paper',
      boxShadow: isSelected ? '0 0 0 2px rgba(31,138,91,0.25)' : 'none',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{
          width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
          bgcolor: isToday ? 'primary.main' : 'transparent',
          color: isToday ? '#fff' : below ? '#c62828' : 'text.primary',
        }}>
          {day}
        </Box>
        {manningDay && (
          <Typography variant="caption" sx={{ ml: 'auto', display: { xs: 'none', md: 'block' },
                                              color: below ? '#c62828' : 'text.secondary', fontWeight: below ? 700 : 400 }}>
            {manningDay.present}/{total}
          </Typography>
        )}
      </Box>

      {/* desktop: small labels */}
      <Box sx={{ display: { xs: 'none', md: 'grid' }, gap: 0.25, mt: 0.5 }}>
        {events.slice(0, 2).map((e, i) => {
          const c = eventColor(e.type);
          return (
            <Box key={i} sx={{ fontSize: 11, px: 0.75, py: 0.25, borderRadius: 1, bgcolor: c.bg, color: c.fg,
                               whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {eventShortLabel(e)}
            </Box>
          );
        })}
        {events.length > 2 && <Typography variant="caption" color="text.secondary">+{events.length - 2}</Typography>}
      </Box>

      {/* phone: dots */}
      {events.length > 0 && (
        <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 0.25, mt: 0.5, justifyContent: 'center' }}>
          {events.slice(0, 3).map((e, i) => (
            <Box key={i} sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: eventColor(e.type).fg }} />
          ))}
        </Box>
      )}
    </ButtonBase>
  );
}

function EventItem({ event, onOpen }) {
  const c = eventColor(event.type);
  const clickable = event.is_mine && event.request_id;
  return (
    <ButtonBase disabled={!clickable} onClick={onOpen} sx={{
      width: '100%', display: 'block', textAlign: 'start', p: 1.25, borderRadius: 2,
      bgcolor: c.bg, borderInlineStart: `3px solid ${c.fg}`,
    }}>
      <Typography variant="body2" fontWeight={700} sx={{ color: c.fg }}>{eventTitle(event)}</Typography>
      <Typography variant="caption" color="text.secondary">{formatDateRange(event.date_from, event.date_to)}</Typography>
    </ButtonBase>
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(null);   // ISO day picked by the user

  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth() + 1;
  const year = Number(params.get('year')) || thisYear;
  const month = Number(params.get('month')) || thisMonth;
  const typeParam = params.get('type');
  const type = TYPES.some((t) => t.value === typeParam) ? typeParam : 'all';

  const cal = useApi('/calendar/month/', { year, month, type });          // Calendar 4.1-4.3
  const upcoming = useApi('/calendar/upcoming/', { type, limit: 5 });      // Calendar 4.4

  function go(nextYear, nextMonth, nextType = type) {
    const next = {};
    if (nextYear !== thisYear || nextMonth !== thisMonth) {
      next.year = String(nextYear);
      next.month = String(nextMonth);
    }
    if (nextType !== 'all') next.type = nextType;
    setParams(next);
    setSelected(null);
  }
  const prevMonth = () => (month === 1 ? go(year - 1, 12) : go(year, month - 1));
  const nextMonth = () => (month === 12 ? go(year + 1, 1) : go(year, month + 1));

  const data = cal.data;
  const todayIso = isoOf(thisYear, thisMonth, today.getDate());
  const isThisMonth = data && data.year === thisYear && data.month === thisMonth;
  const selectedIso = selected || (data ? (isThisMonth ? todayIso : isoOf(data.year, data.month, 1)) : null);
  const manning = data?.manning;

  let grid;
  if (!data) {
    grid = cal.error ? <Alert severity="error">{cal.error}</Alert> : <Skeleton variant="rounded" height={480} />;
  } else {
    const cells = [
      ...Array(data.first_weekday).fill(null),
      ...Array.from({ length: data.days_in_month }, (_, i) => i + 1),
    ];
    grid = (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, md: 0.75 },
                 opacity: cal.loading ? 0.5 : 1, transition: 'opacity .2s' }}>
        {WEEK_DAYS.map(([full, short]) => (
          <Typography key={full} variant="caption" color="text.secondary" fontWeight={700} sx={{ textAlign: 'center', py: 0.5 }}>
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>{full}</Box>
            <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>{short}</Box>
          </Typography>
        ))}
        {cells.map((d, i) => {
          if (!d) return <Box key={`blank-${i}`} />;
          const iso = isoOf(data.year, data.month, d);
          return (
            <DayCell
              key={iso} day={d}
              events={eventsOnDay(data.events, iso)}
              manningDay={manning?.days?.[iso]}
              total={manning?.total_personnel}
              isToday={iso === todayIso}
              isSelected={iso === selectedIso}
              onClick={() => setSelected(iso)}
            />
          );
        })}
      </Box>
    );
  }

  const dayEvents = data && selectedIso ? eventsOnDay(data.events, selectedIso) : [];
  const dayManning = manning?.days?.[selectedIso];
  const [sy, sm, sd] = (selectedIso || '2000-01-01').split('-').map(Number);

  return (
    <Stack spacing={2.5}>
      {/* Month navigation (4.3) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <IconButton onClick={prevMonth} aria-label="الشهر السابق" sx={{ border: 1, borderColor: 'divider' }}>
          <ChevronRightIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={800} sx={{ minWidth: 160, textAlign: 'center' }}>
          {formatMonth(year, month)}
        </Typography>
        <IconButton onClick={nextMonth} aria-label="الشهر التالي" sx={{ border: 1, borderColor: 'divider' }}>
          <ChevronLeftIcon />
        </IconButton>
        <Button variant="outlined" startIcon={<TodayOutlinedIcon />} onClick={() => go(thisYear, thisMonth)}
                disabled={year === thisYear && month === thisMonth}>
          اليوم
        </Button>
      </Box>

      {/* Type filter (4.2) */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {TYPES.map((t) => (
          <Chip key={t.value} label={t.label} clickable onClick={() => go(year, month, t.value)}
                color={type === t.value ? 'primary' : 'default'} variant={type === t.value ? 'filled' : 'outlined'} />
        ))}
      </Box>

      {NOT_CONNECTED.includes(type) && (
        <Alert severity="info" variant="outlined">
          لا توجد بيانات لهذا النوع حالياً، وسيتم ربطه بجدول المناوبات والدورات والمهام لاحقاً.
        </Alert>
      )}
      {manning && (
        <Alert severity="warning" variant="outlined" icon={false}>
          الأرقام في كل يوم = المتواجدون / إجمالي القوة في {manning.site_name}. الأيام المظللة بالأحمر أقل من الحد الأدنى ({manning.minimum}).
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' } }}>
        <Card><CardContent>{grid}</CardContent></Card>

        <Stack spacing={3}>
          {/* Selected day */}
          <Card><CardContent>
            <SectionTitle title={selectedIso ? DAY_FMT.format(new Date(sy, sm - 1, sd)) : 'اليوم المحدد'} />
            {dayManning && (
              <Box sx={{ p: 1.5, mb: 1.5, borderRadius: 2,
                         bgcolor: dayManning.below_minimum ? '#fdecec' : 'primary.light',
                         color: dayManning.below_minimum ? '#c62828' : 'primary.dark' }}>
                <Typography variant="body2" fontWeight={800}>
                  {dayManning.below_minimum ? '⚠️ أقل من الحد الأدنى للتواجد' : 'التواجد ضمن الحد المسموح'}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  المتواجدون {dayManning.present} من {manning.total_personnel} • في إجازة {dayManning.on_leave} • الحد الأدنى {manning.minimum}
                </Typography>
              </Box>
            )}
            {dayEvents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">لا توجد أحداث في هذا اليوم</Typography>
            ) : (
              <Stack spacing={1}>
                {dayEvents.map((e, i) => (
                  <EventItem key={i} event={e} onOpen={() => navigate(`/requests/${e.request_id}`)} />
                ))}
              </Stack>
            )}
          </CardContent></Card>

          {/* Upcoming (4.4) */}
          <Card><CardContent>
            <SectionTitle title="الأحداث القادمة" />
            {upcoming.loading && !upcoming.data && <Skeleton variant="rounded" height={120} />}
            {upcoming.error && <Alert severity="warning" variant="outlined">{upcoming.error}</Alert>}
            {upcoming.data && (upcoming.data.results.length === 0 ? (
              <Typography variant="body2" color="text.secondary">لا توجد أحداث قادمة</Typography>
            ) : (
              <Stack spacing={1}>
                {upcoming.data.results.map((e, i) => (
                  <EventItem key={i} event={e} onOpen={() => navigate(`/requests/${e.request_id}`)} />
                ))}
              </Stack>
            ))}
          </CardContent></Card>
        </Stack>
      </Box>
    </Stack>
  );
}
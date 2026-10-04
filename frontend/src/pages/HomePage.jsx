import { useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, ButtonBase, Card, CardContent, Skeleton, Stack, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../auth/AuthContext';
import useApi from '../hooks/useApi';
import ApprovalPath from '../components/ApprovalPath';
import MiniCalendar from '../components/MiniCalendar';
import SectionTitle from '../components/SectionTitle';
import ServiceTile from '../components/ServiceTile';
import StatusChip from '../components/StatusChip';
import { getCategoryIcon } from '../components/categoryIcons';
import { EXTRA_SERVICES } from '../components/extraServices';
import { formatDateRange, formatDateTime } from '../utils/format';

const STATS = [
  { key: 'under_review', label: 'قيد المراجعة', color: '#d68a1f' },
  { key: 'approved', label: 'معتمدة', color: '#1f8a5b' },
  { key: 'rejected', label: 'مرفوضة', color: '#d64545' },
];
const TILE_GRID = { display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' };

function SectionError({ message }) {
  return <Alert severity="warning" variant="outlined">{message}</Alert>;
}

function EmptyCard({ text }) {
  return (
    <Card><CardContent sx={{ textAlign: 'center', py: 4 }}>
      <Typography color="text.secondary">{text}</Typography>
    </CardContent></Card>
  );
}

// ③ Welcome card (API 4.1 — the logged-in user's profile)
function WelcomeCard({ user }) {
  const greeting = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
  return (
    <Card sx={{ border: 'none', color: '#fff', background: 'linear-gradient(135deg, #0f3b2c 0%, #1b5e3f 100%)' }}>
      <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ opacity: 0.8, fontSize: 14 }}>{greeting} 👋</Typography>
          <Typography variant="h5" fontWeight={800} sx={{ my: 0.5 }}>
            {user.rank ? `${user.rank} / ${user.full_name}` : user.full_name}
          </Typography>
          <Typography sx={{ opacity: 0.75, fontSize: 14 }}>
            الوحدة: {[user.unit_name, user.site_name].filter(Boolean).join(' — ') || '—'}
          </Typography>
        </Box>
        <Avatar sx={{ width: 64, height: 64, bgcolor: '#fff', color: '#5e35b1', border: '3px solid rgba(255,255,255,0.4)' }}>
          <PersonIcon fontSize="large" />
        </Avatar>
      </CardContent>
    </Card>
  );
}

function NewRequestCard({ onClick }) {
  return (
    <Card sx={{ border: 'none', color: '#fff', background: 'linear-gradient(135deg, #2aa36b 0%, #1f8a5b 100%)' }}>
      <ButtonBase onClick={onClick} sx={{ width: '100%', height: '100%', display: 'block', textAlign: 'start', p: 3 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: '#fff', color: 'primary.main',
                   display: 'grid', placeItems: 'center', mb: 2 }}>
          <AddIcon />
        </Box>
        <Typography variant="h6" fontWeight={800}>تقديم طلب جديد</Typography>
        <Typography sx={{ opacity: 0.85, fontSize: 14 }}>إجازة، استئذان، انتداب...</Typography>
      </ButtonBase>
    </Card>
  );
}

// ④ Stat cards (API 4.2)
function StatsRow({ state, onOpen }) {
  if (state.error) return <SectionError message={state.error} />;
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {STATS.map((s) => (
        <Card key={s.key} sx={{ borderTop: `3px solid ${s.color}` }}>
          <ButtonBase onClick={() => onOpen(s.key)} sx={{ width: '100%', display: 'block', py: 2.5, textAlign: 'center' }}>
            {state.loading
              ? <Skeleton width={40} height={44} sx={{ mx: 'auto' }} />
              : <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{state.data[s.key]}</Typography>}
            <Typography variant="body2" color="text.secondary">{s.label}</Typography>
          </ButtonBase>
        </Card>
      ))}
    </Box>
  );
}

// ⑥ Latest request with mini approval path (API 4.4)
function RecentRequest({ state, onOpen, onOpenAll }) {
  let body;
  if (state.loading) body = <Skeleton variant="rounded" height={170} />;
  else if (state.error) body = <SectionError message={state.error} />;
  else if (!state.data.length) body = <EmptyCard text="لا توجد طلبات بعد" />;
  else {
    const r = state.data[0];
    body = (
      <Card><CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2.5 }}>
          <ButtonBase onClick={() => onOpen(r.id)} sx={{ display: 'block', textAlign: 'start', borderRadius: 1 }}>
            <Typography fontWeight={800}>{r.request_type_name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateRange(r.date_from, r.date_to) || r.request_number}
            </Typography>
          </ButtonBase>
          <Box sx={{ ml: 'auto' }}><StatusChip status={r.status} label={r.status_display} /></Box>
        </Box>
        <ApprovalPath steps={r.approval_path} />
        <Button fullWidth variant="outlined" onClick={onOpenAll} endIcon={<ChevronLeftIcon />}
                sx={{ mt: 2.5, borderStyle: 'dashed', borderRadius: 3 }}>
          عرض جميع الطلبات
        </Button>
      </CardContent></Card>
    );
  }
  return (
    <Box>
      <SectionTitle title="طلباتي الأخيرة" actionLabel="التفاصيل" onAction={onOpenAll} />
      {body}
    </Box>
  );
}

// ⑧ Latest notifications (API 4.5)
function LatestNotifications({ state, onOpenAll, onOpenItem }) {
  let body;
  if (state.loading) body = <Skeleton variant="rounded" height={150} />;
  else if (state.error) body = <SectionError message={state.error} />;
  else if (!state.data.results.length) body = <EmptyCard text="لا توجد إشعارات" />;
  else {
    body = (
      <Card>
        {state.data.results.map((n, i) => (
          <ButtonBase key={n.id} onClick={() => onOpenItem(n)} sx={{
            display: 'flex', width: '100%', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 1.5,
            p: 2, textAlign: 'start', borderTop: i ? 1 : 0, borderColor: 'divider',
          }}>
            <Box sx={{ width: 8, height: 8, mt: 1, flexShrink: 0, borderRadius: '50%',
                       bgcolor: n.is_read ? 'transparent' : 'error.main' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={n.is_read ? 400 : 700}
                          sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {n.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">{formatDateTime(n.created_at)}</Typography>
            </Box>
          </ButtonBase>
        ))}
      </Card>
    );
  }
  return (
    <Box>
      <SectionTitle title="أحدث الإشعارات" actionLabel="الكل" onAction={onOpenAll} />
      {body}
    </Box>
  );
}

function eventTitle(e) {
  if (e.is_mine) return e.request_type_name || e.title;
  return `${e.title} — ${[e.person.rank, e.person.full_name].filter(Boolean).join(' ')}`;
}

// Mini calendar (API 4.6) + upcoming events (API 4.7)
function CalendarSection({ month, upcoming, onOpen }) {
  return (
    <Box>
      <SectionTitle title="التقويم" actionLabel="عرض التقويم" onAction={onOpen} />
      <Card><CardContent>
        {month.loading && <Skeleton variant="rounded" height={230} />}
        {month.error && <SectionError message={month.error} />}
        {month.data && <MiniCalendar data={month.data} />}

        <Typography fontWeight={700} sx={{ mt: 2.5, mb: 1 }}>الأحداث القادمة</Typography>
        {upcoming.loading && <Skeleton variant="rounded" height={60} />}
        {upcoming.error && <SectionError message={upcoming.error} />}
        {upcoming.data && (upcoming.data.results.length === 0
          ? <Typography variant="body2" color="text.secondary">لا توجد أحداث قادمة</Typography>
          : (
            <Stack spacing={1}>
              {upcoming.data.results.map((e, i) => (
                <Box key={`${e.type}-${e.date_from}-${i}`} sx={{
                  display: 'flex', gap: 1.5, alignItems: 'center', p: 1.25, borderRadius: 2,
                  bgcolor: e.type === 'return' ? '#e8f0fb' : 'primary.light',
                }}>
                  <EventOutlinedIcon fontSize="small" color={e.type === 'return' ? 'info' : 'primary'} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{eventTitle(e)}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDateRange(e.date_from, e.date_to)}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          ))}
      </CardContent></Card>
    </Box>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const now = new Date();

  // One call per section (Home 4.2 – 4.7); 4.1 (profile) is already in AuthContext
  const summary = useApi('/requests/summary/');
  const types = useApi('/requests/types/');
  const recent = useApi('/requests/recent/', { limit: 1 });
  const notifications = useApi('/notifications/', { limit: 3 });
  const month = useApi('/calendar/month/', { year: now.getFullYear(), month: now.getMonth() + 1 });
  const upcoming = useApi('/calendar/upcoming/', { limit: 3 });

  return (
    <Stack spacing={3}>
      {/* ② urgent alert card: hidden for now (not in ERD / API list) */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        <WelcomeCard user={user} />
        <NewRequestCard onClick={() => navigate('/requests/new')} />
      </Box>

      <StatsRow state={summary} onOpen={(status) => navigate(`/requests?status=${status}`)} />

      {/* ⑤ Main services = request categories (API 4.3) */}
      <Box>
        <SectionTitle title="الخدمات الرئيسية" />
        {types.error ? <SectionError message={types.error} /> : (
          <Box sx={TILE_GRID}>
            {types.loading
              ? Array.from({ length: 10 }, (_, i) => <Skeleton key={i} variant="rounded" height={96} />)
              : types.data.categories.map((c) => (
                <ServiceTile key={c.id} icon={getCategoryIcon(c.icon)} label={c.name}
                             onClick={() => navigate(`/requests/new?category=${c.id}`)} />
              ))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' } }}>
        <Stack spacing={3}>
          {/* ⑦ Additional services (static links for now) */}
          <Box>
            <SectionTitle title="خدمات إضافية" />
            <Box sx={TILE_GRID}>
              {EXTRA_SERVICES.map((s) => (
                <ServiceTile key={s.slug} icon={s.icon} label={s.label} tone={s.tone}
                             onClick={() => navigate(s.to || `/services/${s.slug}`)} />
              ))}
            </Box>
          </Box>
          <CalendarSection month={month} upcoming={upcoming} onOpen={() => navigate('/calendar')} />
        </Stack>

        <Stack spacing={3}>
          <RecentRequest state={recent} onOpen={(id) => navigate(`/requests/${id}`)}
                         onOpenAll={() => navigate('/requests')} />
          <LatestNotifications
            state={notifications}
            onOpenAll={() => navigate('/notifications')}
            onOpenItem={(n) => navigate(n.related_request ? `/requests/${n.related_request}` : '/notifications')}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
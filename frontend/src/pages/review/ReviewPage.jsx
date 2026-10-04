import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Pagination, Skeleton, Snackbar, Stack, Tab,
  Tabs, Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../../auth/AuthContext';
import useApi from '../../hooks/useApi';
import PriorityChip from '../../components/PriorityChip';
import { formatDate, formatDateRange } from '../../utils/format';
import DecisionDialog from './DecisionDialog';

// Review 4.1 tabs (see the mapping agreed for the ERD statuses)
const TABS = [
  { value: 'all', label: 'الكل' },
  { value: 'new', label: 'جديدة' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'awaiting', label: 'بانتظار الاعتماد' },
];
const PAGE_SIZE = 10;

function ReviewRow({ item, onView, onDecide }) {
  const p = item.requester;
  return (
    <Card>
      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar sx={{ bgcolor: 'primary.light', color: '#5e35b1' }}><PersonIcon /></Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography fontWeight={800}>{item.request_type_name}</Typography>
            <PriorityChip priority={item.priority} label={item.priority_display} />
            {item.manning_warning && (
              <Chip size="small" label="⚠️ الحد الأدنى" sx={{ bgcolor: '#fdecec', color: '#c62828', fontWeight: 700 }} />
            )}
          </Box>
          <Typography variant="body2">
            {[p.rank, p.full_name].filter(Boolean).join(' ')} — {p.military_id}{p.unit_name ? ` • ${p.unit_name}` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {item.request_number} • {formatDateRange(item.date_from, item.date_to) || `قُدّم في ${formatDate(item.created_at)}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
          <Button variant="outlined" onClick={onView}>عرض التفاصيل</Button>
          {item.can_decide && <Button variant="contained" onClick={onDecide}>مراجعة الطلب</Button>}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ReviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [deciding, setDeciding] = useState(null);   // request id in the dialog
  const [toast, setToast] = useState('');

  const tabParam = params.get('tab');
  const tab = TABS.some((t) => t.value === tabParam) ? tabParam : 'all';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const list = useApi('/requests/review/', { ...(tab !== 'all' ? { tab } : {}), page });
  const results = list.data?.results || [];
  const pageCount = Math.ceil((list.data?.count || 0) / PAGE_SIZE);

  function go(nextTab, nextPage) {
    const next = {};
    if (nextTab !== 'all') next.tab = nextTab;
    if (nextPage > 1) next.page = String(nextPage);
    setParams(next);
  }

  function decided(message) {
    setDeciding(null);
    setToast(message);
    list.reload();
  }

  let body;
  if (list.loading && !list.data) {
    body = <Stack spacing={1.5}>{[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={96} />)}</Stack>;
  } else if (list.error) {
    body = <Alert severity="error">{list.error}</Alert>;
  } else if (!results.length) {
    body = (
      <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary">لا توجد طلبات في هذا التبويب</Typography>
      </CardContent></Card>
    );
  } else {
    body = (
      <Stack spacing={1.5} sx={{ opacity: list.loading ? 0.5 : 1, transition: 'opacity .2s' }}>
        {results.map((item) => (
          <ReviewRow key={item.id} item={item}
                     onView={() => navigate(`/requests/${item.id}`)}
                     onDecide={() => setDeciding(item.id)} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Typography fontWeight={800}>
        الطلبات الجديدة والمراجعة (بصفتك {user.role_display})
      </Typography>

      <Tabs value={tab} onChange={(_, v) => go(v, 1)} variant="scrollable" allowScrollButtonsMobile
            sx={{ borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
      </Tabs>

      {tab === 'awaiting' && (
        <Alert severity="info" variant="outlined">
          طلبات اعتمدتها في مرحلتك وتنتظر اعتماد مرحلة لاحقة — للاطلاع فقط.
        </Alert>
      )}

      {body}

      {pageCount > 1 && (
        <Pagination color="primary" count={pageCount} page={page} onChange={(_, p) => go(tab, p)}
                    sx={{ alignSelf: 'center' }} />
      )}

      {deciding && <DecisionDialog requestId={deciding} onClose={() => setDeciding(null)} onDone={decided} />}

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, InputAdornment, Pagination, Skeleton, Stack, Tab, Tabs,
  TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import useApi from '../hooks/useApi';
import RequestRow from '../components/RequestRow';

// Tabs = status groups of API 4.1 (same as the Home stat cards) + the archive (API 4.2)
const TABS = [
  { value: 'all', label: 'الكل' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'approved', label: 'معتمدة' },
  { value: 'rejected', label: 'مرفوضة' },
  { value: 'cancelled', label: 'ملغاة' },
  { value: 'archive', label: 'الأرشيف' },
];
const PAGE_SIZE = 10;   // same as the server's StandardPagination

export default function MyRequestsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // All filters live in the URL: ?status=approved&q=...&page=2 (back button + Home links work)
  const statusParam = params.get('status');
  const tab = TABS.some((t) => t.value === statusParam) ? statusParam : 'all';
  const q = params.get('q') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);

  const updateParams = useCallback((changes) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(changes).forEach(([key, value]) => {
        const isDefault = value === '' || value == null
          || (key === 'page' && value === 1) || (key === 'status' && value === 'all');
        if (isDefault) next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    });
  }, [setParams]);

  // Search: update the URL 400 ms after the user stops typing (not on every key)
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === q) return undefined;
    const timer = setTimeout(() => updateParams({ q: trimmed, page: 1 }), 400);
    return () => clearTimeout(timer);
  }, [search, q, updateParams]);

  const isArchive = tab === 'archive';
  const list = useApi(isArchive ? '/requests/archive/' : '/requests/mine/', {
    ...(tab !== 'all' && !isArchive ? { status: tab } : {}),
    ...(q ? { q } : {}),
    page,
  });

  const results = list.data?.results || [];
  const pageCount = Math.ceil((list.data?.count || 0) / PAGE_SIZE);

  let body;
  if (list.loading && !list.data) {
    body = <Stack spacing={1.5}>{[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={140} />)}</Stack>;
  } else if (list.error) {
    body = (
      <Alert severity="error" action={<Button onClick={() => updateParams({ page: 1 })}>الصفحة الأولى</Button>}>
        {list.error}
      </Alert>
    );
  } else if (!results.length) {
    body = (
      <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary">
          {q ? 'لا توجد طلبات مطابقة للبحث' : 'لا توجد طلبات في هذا التصنيف'}
        </Typography>
      </CardContent></Card>
    );
  } else {
    body = (
      <Stack spacing={1.5} sx={{ opacity: list.loading ? 0.5 : 1, transition: 'opacity .2s' }}>
        {results.map((r) => (
          <RequestRow key={r.id} request={r} onClick={() => navigate(`/requests/${r.id}`)} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="ابحث برقم الطلب أو نوعه..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 220, maxWidth: 420, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/requests/new')} sx={{ ml: 'auto' }}>
          طلب جديد
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => updateParams({ status: v, page: 1 })}
            variant="scrollable" allowScrollButtonsMobile sx={{ borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
      </Tabs>

      {isArchive && (
        <Alert severity="info" variant="outlined">
          الأرشيف يعرض الطلبات المغلقة: المعتمدة والمرفوضة والملغاة.
        </Alert>
      )}

      {body}

      {pageCount > 1 && (
        <Pagination color="primary" count={pageCount} page={page}
                    onChange={(_, p) => updateParams({ page: p })} sx={{ alignSelf: 'center' }} />
      )}
    </Stack>
  );
}
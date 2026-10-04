import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, ButtonBase, Card, CardContent, IconButton, Skeleton, Stack, Tab, Tabs,
  Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined';
import api, { getErrorMessage } from '../api/client';
import useApi from '../hooks/useApi';
import { notifyNotificationsChanged } from '../hooks/useUnreadCount';
import { formatDateTime } from '../utils/format';

// Notifications 4.1 filter
const FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'unread', label: 'غير المقروءة' },
  { value: 'read', label: 'المقروءة' },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const list = useApi('/notifications/', { filter, limit: 50 });
  const results = list.data?.results || [];
  const unread = list.data?.unread_count || 0;

  // Notifications 2.2 — the "✕": mark as read (never deleted)
  async function markRead(n) {
    if (n.is_read) return;
    try {
      await api.patch(`/notifications/${n.id}/read/`);
      notifyNotificationsChanged();
      list.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Notifications 2.1 — mark all as read
  async function markAll() {
    try {
      await api.post('/notifications/read-all/');
      notifyNotificationsChanged();
      list.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function open(n) {
    await markRead(n);
    if (n.related_request) navigate(`/requests/${n.related_request}`);
  }

  let body;
  if (list.loading && !list.data) {
    body = <Skeleton variant="rounded" height={260} />;
  } else if (list.error) {
    body = <Alert severity="error">{list.error}</Alert>;
  } else if (!results.length) {
    body = (
      <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary">لا توجد إشعارات</Typography>
      </CardContent></Card>
    );
  } else {
    body = (
      <Card sx={{ opacity: list.loading ? 0.6 : 1, transition: 'opacity .2s' }}>
        {results.map((n, i) => (
          <Box key={n.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1,
                                borderTop: i ? 1 : 0, borderColor: 'divider',
                                bgcolor: n.is_read ? 'transparent' : '#f7fbf9' }}>
            <ButtonBase onClick={() => open(n)} sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-start',
                                                     alignItems: 'flex-start', gap: 1.5, p: 2, textAlign: 'start' }}>
              <Box sx={{ width: 8, height: 8, mt: 1, flexShrink: 0, borderRadius: '50%',
                         bgcolor: n.is_read ? 'transparent' : 'error.main' }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={n.is_read ? 400 : 700}>{n.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(n.created_at)}
                  {n.related_request_number ? ` • ${n.related_request_number}` : ''}
                </Typography>
              </Box>
            </ButtonBase>
            {!n.is_read && (
              <Tooltip title="تحديد كمقروء">
                <IconButton size="small" onClick={() => markRead(n)} sx={{ m: 1.5 }} aria-label="تحديد كمقروء">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ))}
      </Card>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ minHeight: 0 }}>
          {FILTERS.map((f) => <Tab key={f.value} value={f.value} label={f.label} />)}
        </Tabs>
        <Button variant="outlined" startIcon={<DoneAllOutlinedIcon />} onClick={markAll}
                disabled={!unread} sx={{ ml: 'auto' }}>
          تحديد الكل كمقروء{unread ? ` (${unread})` : ''}
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {body}

      {results.length >= 50 && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          يتم عرض آخر 50 إشعاراً
        </Typography>
      )}
    </Stack>
  );
}
import { Box, ButtonBase, Card, Typography } from '@mui/material';
import ApprovalPath from './ApprovalPath';
import PriorityChip from './PriorityChip';
import StatusChip from './StatusChip';
import { formatDate, formatDateRange } from '../utils/format';

/** One request in a list: type, number, dates, status, mini approval path. */
export default function RequestRow({ request: r, onClick }) {
  return (
    <Card>
      <ButtonBase onClick={onClick} sx={{ width: '100%', display: 'block', textAlign: 'start', p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography fontWeight={800}>{r.request_type_name}</Typography>
              <PriorityChip priority={r.priority} label={r.priority_display} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {r.request_number}{r.category_name ? ` • ${r.category_name}` : ''}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {formatDateRange(r.date_from, r.date_to) || `قُدّم في ${formatDate(r.created_at)}`}
            </Typography>
          </Box>
          <StatusChip status={r.status} label={r.status_display} />
        </Box>
        {r.approval_path && (
          <Box sx={{ mt: 2, maxWidth: 520 }}>
            <ApprovalPath steps={r.approval_path} />
          </Box>
        )}
      </ButtonBase>
    </Card>
  );
}
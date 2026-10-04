import { Chip } from '@mui/material';

const COLORS = {
  PENDING: { bg: '#e8f0fb', fg: '#2f5fa7' },
  PENDING_EDIT: { bg: '#fff4e5', fg: '#b26a00' },
  APPROVED: { bg: '#e6f4ec', fg: '#1f8a5b' },
  COMPLETED: { bg: '#e6f4ec', fg: '#156b45' },
  REJECTED: { bg: '#fdecec', fg: '#c62828' },
  CANCELLED: { bg: '#f0f2f1', fg: '#5f6f67' },
};

/** Coloured status badge. The label comes from the API (status_display). */
export default function StatusChip({ status, label }) {
  const c = COLORS[status] || COLORS.CANCELLED;
  return <Chip size="small" label={label} sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 700 }} />;
}
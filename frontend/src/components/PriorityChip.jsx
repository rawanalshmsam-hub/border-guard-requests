import { Chip } from '@mui/material';

const COLORS = {
  URGENT: { bg: '#fff4e5', fg: '#b26a00' },
  EMERGENCY: { bg: '#fdecec', fg: '#c62828' },
};

/** Shown only for urgent / emergency — "normal" needs no badge. */
export default function PriorityChip({ priority, label }) {
  const c = COLORS[priority];
  if (!c) return null;
  return <Chip size="small" label={label} sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 700 }} />;
}
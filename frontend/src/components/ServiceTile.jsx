import { Box, ButtonBase, Typography } from '@mui/material';

const TONES = {
  primary: { bg: '#e6f4ec', fg: '#1f8a5b' },
  error: { bg: '#fdecec', fg: '#d64545' },
};

export default function ServiceTile({ icon: Icon, label, onClick, tone = 'primary' }) {
  const c = TONES[tone] || TONES.primary;
  return (
    <ButtonBase onClick={onClick} sx={{
      flexDirection: 'column', gap: 1, p: 1.5, minHeight: 96, borderRadius: 3,
      border: 1, borderColor: 'divider', bgcolor: 'background.paper',
      '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 12px rgba(20,38,29,0.08)' },
    }}>
      <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: c.bg, color: c.fg }}>
        <Icon fontSize="small" />
      </Box>
      <Typography variant="caption" fontWeight={600} sx={{ lineHeight: 1.4, textAlign: 'center' }}>
        {label}
      </Typography>
    </ButtonBase>
  );
}
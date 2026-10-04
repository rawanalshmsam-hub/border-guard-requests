import { Box, IconButton, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

/** "→" back button + title, as on the New Request design (in RTL the back arrow points right) */
export default function PageHeader({ title, subtitle, onBack }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
      <IconButton onClick={onBack} aria-label="رجوع"
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.paper' }}>
        <ArrowForwardIcon />
      </IconButton>
      <Box>
        <Typography variant="h6" fontWeight={800}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Box>
  );
}
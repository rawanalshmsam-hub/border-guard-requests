import { Box, Button, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

/** Section heading with the green bar, and an optional link on the other side ("التفاصيل ‹") */
export default function SectionTitle({ title, actionLabel, onAction }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
      <Typography fontWeight={800} sx={{ borderLeft: '3px solid', borderColor: 'primary.main', pl: 1.25, lineHeight: 1.3 }}>
        {title}
      </Typography>
      {actionLabel && (
        <Button size="small" onClick={onAction} endIcon={<ChevronLeftIcon />} sx={{ ml: 'auto' }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
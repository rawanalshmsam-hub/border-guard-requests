import { Box, ButtonBase, Card, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

/** Clickable row card: icon square, title, small subtitle, "‹" */
export default function OptionCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <Card>
      <ButtonBase onClick={onClick} sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start',
                                          alignItems: 'center', gap: 2, p: 2, textAlign: 'start' }}>
        <Box sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: 2.5, display: 'grid', placeItems: 'center',
                   bgcolor: 'primary.light', color: 'primary.main' }}>
          <Icon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={800} noWrap>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <ChevronLeftIcon color="action" />
      </ButtonBase>
    </Card>
  );
}
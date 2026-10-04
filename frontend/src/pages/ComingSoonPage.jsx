import { Box, Card, CardContent, Typography } from '@mui/material';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';

export default function ComingSoonPage() {
  return (
    <Card>
      <CardContent sx={{ py: 8, textAlign: 'center' }}>
        <Box sx={{ color: 'primary.main', mb: 1 }}>
          <ConstructionOutlinedIcon sx={{ fontSize: 48 }} />
        </Box>
        <Typography variant="h6" fontWeight={700}>هذه الصفحة قيد التطوير</Typography>
        <Typography color="text.secondary">سيتم إضافتها قريباً</Typography>
      </CardContent>
    </Card>
  );
}
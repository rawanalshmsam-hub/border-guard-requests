import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StatusChip from '../../components/StatusChip';

export default function SubmitSuccess({ request, onNew }) {
  const navigate = useNavigate();
  return (
    <Card sx={{ maxWidth: 560, mx: 'auto' }}>
      <CardContent sx={{ textAlign: 'center', py: 6 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
        <Typography variant="h6" fontWeight={800} sx={{ mt: 1 }}>تم إرسال طلبك بنجاح</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          رقم الطلب: <Box component="b" sx={{ color: 'text.primary' }}>{request.request_number}</Box>
        </Typography>
        <Box sx={{ mt: 1.5 }}><StatusChip status={request.status} label={request.status_display} /></Box>
        <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 3, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => navigate(`/requests/${request.id}`)}>عرض الطلب</Button>
          <Button variant="outlined" onClick={onNew}>طلب جديد</Button>
          <Button onClick={() => navigate('/')}>الرئيسية</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';

export default function HomePage() {
  const { user, logout } = useAuth();
  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>أهلاً، {user.rank} {user.full_name}</Typography>
          <Typography color="text.secondary">{user.unit_name} — {user.site_name}</Typography>
          <Typography color="text.secondary">الدور: {user.role_display}</Typography>
          <Button variant="outlined" color="secondary" sx={{ mt: 2 }} onClick={logout}>تسجيل الخروج</Button>
        </CardContent>
      </Card>
    </Box>
  );
}
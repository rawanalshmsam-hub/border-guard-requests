import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { useAuth } from '../auth/AuthContext';
import ChangePasswordCard from '../components/ChangePasswordCard';
import SectionTitle from '../components/SectionTitle';

const APP_VERSION = '1.0.0';

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, py: 1.25, borderBottom: 1, borderColor: 'divider',
               '&:last-of-type': { borderBottom: 0 } }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 130, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
    </Box>
  );
}

/** Settings (option a): change password + app info + session. No preferences table (beyond the ERD). */
export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      <ChangePasswordCard />

      <Stack spacing={3}>
        <Card><CardContent>
          <SectionTitle title="عن المنصة" />
          <InfoRow label="اسم المنصة" value="منصة طلبات منسوبي حرس الحدود" />
          <InfoRow label="الإصدار" value={APP_VERSION} />
          <InfoRow label="اللغة" value="العربية" />
          <InfoRow label="التقويم" value="الميلادي" />
          <InfoRow label="الدعم الفني" value="تواصل مع مدير النظام في وحدتك" />
        </CardContent></Card>

        <Card><CardContent>
          <SectionTitle title="الجلسة" />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            أنت مسجل الدخول باسم {[user.rank, user.full_name].filter(Boolean).join(' ')}.
            تنتهي صلاحية الجلسة تلقائياً بعد يوم واحد من عدم الاستخدام.
          </Typography>
          <Button variant="outlined" color="error" startIcon={<PowerSettingsNewIcon />} onClick={logout}>
            تسجيل الخروج من هذا الجهاز
          </Button>
        </CardContent></Card>
      </Stack>
    </Box>
  );
}
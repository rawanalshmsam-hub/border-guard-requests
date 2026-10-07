import { Avatar, Box, Stack, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../auth/AuthContext';
import SectionTitle from '../components/SectionTitle';

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', gap:2 ,py: 1.5, borderBottom: 1, borderColor: 'divider',
               '&:last-of-type': { borderBottom: 0 } }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value || '—'}</Typography>
    </Box>
  );
}

/** Profile: read-only personal data (API Home 4.1). Password is changed from Settings. */
export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <Box sx={{ maxWidth: 720, mt:19}}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.light', color: '#5e35b1' }}>
          <PersonIcon fontSize="large" />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800}>{user.full_name}</Typography>
          <Typography color="text.secondary">{user.rank}</Typography>
        </Box>
      </Stack>

      <SectionTitle title="البيانات الأساسية" />
      <InfoRow label="الرقم العسكري" value={user.military_id} />
      <InfoRow label="الدور" value={user.role_display} />
      <InfoRow label="الوحدة" value={user.unit_name} />
      <InfoRow label="الموقع" value={user.site_name} />
      <InfoRow label="الجوال" value={user.phone} />
      <InfoRow label="البريد الإلكتروني" value={user.email} />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        لتعديل هذه البيانات تواصل مع مدير النظام.
      </Typography>
    </Box>
  );
}
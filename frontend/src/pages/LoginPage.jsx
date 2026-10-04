import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../api/client';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [militaryId, setMilitaryId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(militaryId.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2,
               background: 'linear-gradient(160deg, #0b1a2e 0%, #10324a 60%, #1b4d36 100%)' }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <ShieldIcon color="primary" sx={{ fontSize: 56 }} />
            <Typography variant="h6" fontWeight={700}>منصة طلبات منسوبي حرس الحدود</Typography>
            <Typography variant="body2" color="text.secondary">تسجيل الدخول</Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              label="الرقم العسكري" fullWidth required margin="normal" autoFocus
              value={militaryId} onChange={(e) => setMilitaryId(e.target.value)}
              slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'username' } }}
            />
            <TextField
              label="كلمة المرور" type="password" fullWidth required margin="normal"
              value={password} onChange={(e) => setPassword(e.target.value)}
              slotProps={{ htmlInput: { autoComplete: 'current-password' } }}
            />
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }}
                    disabled={submitting || !militaryId || !password}>
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'دخول'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
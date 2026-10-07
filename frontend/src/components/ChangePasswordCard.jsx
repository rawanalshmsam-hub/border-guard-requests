import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField } from '@mui/material';
import api, { getErrorMessage } from '../api/client';
import SectionTitle from './SectionTitle';

export default function ChangePasswordCard() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  async function submit(e) {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const found = {};
    if (!form.current) found.current = 'أدخل كلمة المرور الحالية';
    if (form.next.length < 8) found.next = 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف';
    if (form.confirm !== form.next) found.confirm = 'كلمتا المرور غير متطابقتين';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-password/', {
        current_password: form.current, new_password: form.next,
      });
      setForm({ current: '', next: '', confirm: '' });
      setMessage({ type: 'success', text: data.message });
    } catch (err) {
      const body = err.response?.data;
      if (body?.field === 'current_password') setErrors({ current: body.message });
      else if (body?.field === 'new_password') setErrors({ next: body.message });
      else setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card><CardContent>
      <SectionTitle title="تغيير كلمة المرور" />
      <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2 }}>
        {message.text && <Alert severity={message.type}>{message.text}</Alert>}
        <TextField type="password" label="كلمة المرور الحالية" value={form.current} onChange={set('current')}
                   error={Boolean(errors.current)} helperText={errors.current}
                   slotProps={{ htmlInput: { autoComplete: 'current-password' } }} />
        <TextField type="password" label="كلمة المرور الجديدة" value={form.next} onChange={set('next')}
                   error={Boolean(errors.next)}
                   helperText={errors.next || '8 أحرف على الأقل، ولا تكون أرقاماً فقط أو شائعة أو مشابهة لبياناتك'}
                   slotProps={{ htmlInput: { autoComplete: 'new-password' } }} />
        <TextField type="password" label="تأكيد كلمة المرور الجديدة" value={form.confirm} onChange={set('confirm')}
                   error={Boolean(errors.confirm)} helperText={errors.confirm}
                   slotProps={{ htmlInput: { autoComplete: 'new-password' } }} />
        <Button type="submit" variant="contained" disabled={busy} sx={{ justifySelf: 'start', px: 4 }}>
          {busy ? <CircularProgress size={22} color="inherit" /> : 'حفظ كلمة المرور'}
        </Button>
      </Box>
    </CardContent></Card>
  );
}
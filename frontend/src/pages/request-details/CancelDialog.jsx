import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography,
} from '@mui/material';
import api, { getErrorMessage } from '../../api/client';

/** Request details 3.1 — soft cancel (status becomes CANCELLED, nothing is deleted). */
export default function CancelDialog({ requestId, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await api.patch(`/requests/${requestId}/`, { status: 'CANCELLED', reason: reason.trim() });
      onDone('تم إلغاء الطلب');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle fontWeight={800}>إلغاء الطلب</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن الإلغاء، وسيبقى الطلب محفوظاً في الأرشيف.
        </Typography>
        <TextField fullWidth multiline minRows={2} label="سبب الإلغاء (اختياري)"
                   value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>تراجع</Button>
        <Button color="error" variant="contained" onClick={confirm} disabled={busy}>تأكيد الإلغاء</Button>
      </DialogActions>
    </Dialog>
  );
}
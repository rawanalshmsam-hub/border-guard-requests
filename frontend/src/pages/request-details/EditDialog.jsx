import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField,
} from '@mui/material';
import api, { getErrorMessage } from '../../api/client';
import useApi from '../../hooks/useApi';
import { DATE_ORDER_ERROR, daysBetween, daysLabel } from '../../utils/dates';

const FIELDS = ['reason', 'date_from', 'date_to', 'priority'];

/** Request details 2.1 — edit after the approver returned the request (PENDING_EDIT). */
export default function EditDialog({ request, onClose, onDone }) {
  const types = useApi('/requests/types/');               // for the priority options
  const hasDates = Boolean(request.date_from);
  const [reason, setReason] = useState(request.reason || '');
  const [dateFrom, setDateFrom] = useState(request.date_from || '');
  const [dateTo, setDateTo] = useState(request.date_to || '');
  const [priority, setPriority] = useState(request.priority);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [busy, setBusy] = useState(false);

  const priorities = types.data?.priorities || [{ value: request.priority, label: request.priority_display }];
  const datesValid = dateFrom && dateTo && dateTo >= dateFrom;

  function changeDates(nextFrom, nextTo) {
    setDateFrom(nextFrom);
    setDateTo(nextTo);
    setErrors((prev) => ({ ...prev, date_from: '', date_to: nextFrom && nextTo && nextTo < nextFrom ? DATE_ORDER_ERROR : '' }));
  }

  async function save() {
    const found = {};
    if (!reason.trim()) found.reason = 'سبب الطلب مطلوب';
    if (hasDates && (!dateFrom || !dateTo)) found.date_to = 'التاريخان مطلوبان';
    if (hasDates && dateFrom && dateTo && dateTo < dateFrom) found.date_to = DATE_ORDER_ERROR;
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setGeneralError('');
    try {
      await api.put(`/requests/${request.id}/`, {
        reason: reason.trim(),
        priority,
        ...(hasDates ? { date_from: dateFrom, date_to: dateTo } : {}),
      });
      onDone('تم تعديل الطلب وإعادته للمراجعة');
    } catch (err) {
      const body = err.response?.data;
      if (body?.field && FIELDS.includes(body.field)) setErrors({ [body.field]: body.message });
      else setGeneralError(getErrorMessage(err));        // e.g. E203 overlap, E204 attachment missing
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle fontWeight={800}>تعديل الطلب</DialogTitle>
      <DialogContent>
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          بعد الحفظ سيعود الطلب للمراجعة لدى نفس المعتمد الذي أعاده.
        </Alert>
        {generalError && <Alert severity="error" sx={{ mb: 2 }}>{generalError}</Alert>}
        <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField label="سبب الطلب" fullWidth multiline minRows={3} value={reason}
                     onChange={(e) => setReason(e.target.value)}
                     error={Boolean(errors.reason)} helperText={errors.reason}
                     slotProps={{ htmlInput: { maxLength: 1000 } }} />
          {hasDates && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField label="تاريخ البداية" type="date" value={dateFrom}
                         onChange={(e) => changeDates(e.target.value, dateTo)}
                         error={Boolean(errors.date_from)} helperText={errors.date_from}
                         slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: dateTo || undefined } }} />
              <TextField label="تاريخ النهاية" type="date" value={dateTo}
                         onChange={(e) => changeDates(dateFrom, e.target.value)}
                         error={Boolean(errors.date_to)}
                         helperText={errors.date_to || (datesValid ? `المدة: ${daysLabel(daysBetween(dateFrom, dateTo))}` : '')}
                         slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: dateFrom || undefined } }} />
            </Box>
          )}
          <TextField select label="الأولوية" value={priority} onChange={(e) => setPriority(e.target.value)}
                     error={Boolean(errors.priority)} helperText={errors.priority}>
            {priorities.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>تراجع</Button>
        <Button variant="contained" onClick={save} disabled={busy}>حفظ وإعادة الإرسال</Button>
      </DialogActions>
    </Dialog>
  );
}
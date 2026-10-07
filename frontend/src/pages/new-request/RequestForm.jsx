import { useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, IconButton, MenuItem, TextField, Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import api, { getErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import CategoryIcon from '../../components/CategoryIcon';

import { DATE_ORDER_ERROR, daysBetween, daysLabel } from '../../utils/dates';
import { ACCEPT, MAX_FILES, MAX_MB, checkFiles } from '../../utils/files';
import { formatFileSize } from '../../utils/format';

const FORM_FIELDS = ['reason', 'date_from', 'date_to', 'priority', 'files'];

function Field({ label, required, children }) {
  return (
    <Box>
      <Typography fontWeight={700} fontSize={14} sx={{ mb: 0.75 }}>
        {label}{required && <Box component="span" sx={{ color: 'error.main' }}> *</Box>}
      </Typography>
      {children}
    </Box>
  );
}

/** Screen 2: the form. ① priority options come from API 4.1; ② submit = API 1.1 (fields + files together). */
export default function RequestForm({ type, category, priorities, onBack, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priority, setPriority] = useState(priorities[0]?.value || 'NORMAL');
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const setFieldError = (field, message) => setErrors((prev) => ({ ...prev, [field]: message }));

  // Re-check the date order on every change, so the error appears immediately
  function changeDates(nextFrom, nextTo) {
    setDateFrom(nextFrom);
    setDateTo(nextTo);
    setErrors((prev) => ({
      ...prev,
      date_from: '',
      date_to: nextFrom && nextTo && nextTo < nextFrom ? DATE_ORDER_ERROR : '',
    }));
  }

  const datesValid = dateFrom && dateTo && dateTo >= dateFrom;

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const message = checkFiles(files, incoming);
    if (message) { setFieldError('files', message); return; }
    setFiles((prev) => [...prev, ...incoming]);
    setFieldError('files', '');
  }

  function validate() {
    const e = {};
    if (!reason.trim()) e.reason = 'سبب الطلب مطلوب';
    if (type.requires_dates) {
      if (!dateFrom) e.date_from = 'تاريخ البداية مطلوب';
      if (!dateTo) e.date_to = 'تاريخ النهاية مطلوب';
      if (dateFrom && dateTo && dateTo < dateFrom) e.date_to = DATE_ORDER_ERROR;
    }
    if (type.requires_attachment && !files.length) e.files = 'هذا الطلب يتطلب إرفاق مستند';
    return e;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setGeneralError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const form = new FormData();
    form.append('request_type', String(type.id));
    form.append('reason', reason.trim());
    form.append('priority', priority);
    if (type.requires_dates) {
      form.append('date_from', dateFrom);
      form.append('date_to', dateTo);
    }
    files.forEach((f) => form.append('files', f));

    setSubmitting(true);
    try {
      const { data } = await api.post('/requests/', form);
      onSubmitted(data);
    } catch (err) {
      const body = err.response?.data;
      if (body?.field && FORM_FIELDS.includes(body.field)) {
        setFieldError(body.field, body.message);          // highlight the exact field (E201 / E204)
      } else {
        setGeneralError(getErrorMessage(err));            // e.g. E203 overlap, E205 no approver
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <PageHeader title="تعبئة الطلب" subtitle="أكمل البيانات المطلوبة ثم أرسل" onBack={onBack} />

      <Box sx={{ maxWidth: 920, mx: 'auto', display: 'grid', gap: 2.5 }}>
        {/* Selected type banner */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 3,
                   border: '1px solid', borderColor: 'primary.main', bgcolor: 'primary.light' }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center',
                     bgcolor: 'primary.main', color: '#fff' }}>
            <CategoryIcon name={category.icon} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">نوع الطلب المحدد</Typography>
            <Typography fontWeight={800}>{type.name}</Typography>
          </Box>
        </Box>

        {generalError && <Alert severity="error">{generalError}</Alert>}

        <Field label="سبب الطلب" required>
          <TextField
            fullWidth multiline minRows={3} placeholder="اكتب سبب الطلب هنا..."
            value={reason} onChange={(e) => setReason(e.target.value)}
            error={Boolean(errors.reason)} helperText={errors.reason || `${reason.length}/1000`}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        </Field>

        {type.requires_dates && (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Field label="تاريخ البداية" required>
              <TextField
                fullWidth type="date" value={dateFrom}
                onChange={(e) => changeDates(e.target.value, dateTo)}
                error={Boolean(errors.date_from)} helperText={errors.date_from}
                slotProps={{ htmlInput: { max: dateTo || undefined } }}
              />
            </Field>
            <Field label="تاريخ النهاية" required>
              <TextField
                fullWidth type="date" value={dateTo}
                onChange={(e) => changeDates(dateFrom, e.target.value)}
                error={Boolean(errors.date_to)}
                helperText={errors.date_to || (datesValid ? `المدة: ${daysLabel(daysBetween(dateFrom, dateTo))}` : '')}
                slotProps={{ htmlInput: { min: dateFrom || undefined } }}
              />
            </Field>
          </Box>
        )}

        <Field label="الأولوية">
          <TextField select fullWidth value={priority} onChange={(e) => setPriority(e.target.value)}
                     error={Boolean(errors.priority)} helperText={errors.priority}>
            {priorities.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
          </TextField>
        </Field>

        <Field label={type.requires_attachment ? 'المرفقات' : 'المرفقات (اختياري)'} required={type.requires_attachment}>
          <Box
            component="label"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            sx={{
              display: 'block', p: 3, textAlign: 'center', cursor: 'pointer', borderRadius: 3,
              border: '2px dashed', borderColor: errors.files ? 'error.main' : dragging ? 'primary.main' : 'divider',
              bgcolor: dragging ? 'primary.light' : 'transparent',
            }}
          >
            <input hidden type="file" multiple accept={ACCEPT}
                   onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <AttachFileIcon color="action" />
            <Typography variant="body2" color="text.secondary">
              اضغط لإرفاق مستند (PDF, JPG, PNG) — حتى {MAX_FILES} ملفات، {MAX_MB} ميجابايت للملف
            </Typography>
          </Box>
          {errors.files && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>{errors.files}</Typography>
          )}
          {files.map((f, i) => (
            <Box key={`${f.name}-${i}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, px: 1.5, py: 0.75,
                                             borderRadius: 2, bgcolor: '#f5f8f6' }}>
              <AttachFileIcon fontSize="small" color="action" />
              <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>{f.name}</Typography>
              <Typography variant="caption" color="text.secondary">{formatFileSize(f.size)}</Typography>
              <IconButton size="small" aria-label="حذف"
                          onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Field>

        <Button type="submit" size="large" variant="contained" disabled={submitting}
                sx={{ py: 1.5, borderRadius: 3, background: 'linear-gradient(90deg, #1f8a5b, #2aa36b)' }}>
          {submitting ? <CircularProgress size={24} color="inherit" /> : 'إرسال الطلب'}
        </Button>
      </Box>
    </Box>
  );
}
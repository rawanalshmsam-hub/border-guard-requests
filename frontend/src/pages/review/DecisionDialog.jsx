import { useState } from 'react';
import {
  Alert, AlertTitle, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, IconButton, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import api, { getErrorMessage } from '../../api/client';
import useApi from '../../hooks/useApi';
import PriorityChip from '../../components/PriorityChip';
import { daysBetween, daysLabel } from '../../utils/dates';
import { openAttachment } from '../../utils/files';
import { formatDate, formatDateRange } from '../../utils/format';

// Review 2.1 / 2.2 / 2.3
const DECISIONS = {
  approve: { label: 'اعتماد', color: 'success', endpoint: 'approve', done: 'تم اعتماد الطلب' },
  return: { label: 'إعادة للتعديل', color: 'warning', endpoint: 'return', done: 'تمت إعادة الطلب لمقدمه للتعديل' },
  reject: { label: 'رفض', color: 'error', endpoint: 'reject', done: 'تم رفض الطلب' },
};

function Row({ label, children }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {children}
      </Typography>
    </Box>
  );
}

/** Live manning result returned by the details API (Review 4.2) or by an E405 refusal. */
function ManningPanel({ manning }) {
  if (!manning) return null;   // not a leave request
  if (manning.error_code) {
    return (
      <Alert severity="warning">
        <AlertTitle>تعذر التحقق من بيانات التواجد ({manning.error_code})</AlertTitle>
        يلزم التحقق يدوياً من عدد المتواجدين قبل الاعتماد.
      </Alert>
    );
  }
  if (!manning.below_minimum) {
    return (
      <Alert severity="success" variant="outlined">
        التواجد ضمن الحد المسموح خلال فترة الطلب (القوة {manning.total_personnel}، الحد الأدنى {manning.minimum}).
      </Alert>
    );
  }
  return (
    <Alert severity="error" icon={false} sx={{ border: '1px solid #f5c2c2' }}>
      <AlertTitle sx={{ fontWeight: 800 }}>⚠️ تنبيه الحد الأدنى للتواجد</AlertTitle>
      اعتماد هذا الطلب سيجعل عدد المتواجدين في الموقع أقل من الحد الأدنى ({manning.minimum}) في الأيام التالية:
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, my: 1.25 }}>
        {manning.affected_dates.map((d) => (
          <Chip key={d} size="small" label={formatDate(d)} sx={{ bgcolor: '#fff', color: '#c62828', fontWeight: 700 }} />
        ))}
      </Box>
      <Typography variant="caption" sx={{ display: 'block' }}>
        إجمالي القوة في الموقع: {manning.total_personnel}. التنبيه استشاري والقرار لك، لكن يجب الإقرار به قبل الاعتماد، ويُسجَّل الإقرار في سجل الطلب.
      </Typography>
    </Alert>
  );
}

export default function DecisionDialog({ requestId, onClose, onDone }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const detail = useApi(`/requests/${requestId}/`);       // Review 4.2 — includes a LIVE manning check
  const [decision, setDecision] = useState('approve');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [serverManning, setServerManning] = useState(null); // filled if the server refuses with E405
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const r = detail.data;
  const manning = serverManning || r?.manning || null;
  const warning = Boolean(manning?.below_minimum);
  const needsReason = decision !== 'approve';
  const blockedByWarning = decision === 'approve' && warning && !acknowledged;

  async function submit() {
    if (needsReason && !reason.trim()) {
      setReasonError('يجب كتابة سبب الرفض أو الإعادة للتعديل');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post(`/requests/${requestId}/${DECISIONS[decision].endpoint}/`, {
        reason: reason.trim(),
        manning_acknowledged: decision === 'approve' && warning && acknowledged,
      });
      onDone(DECISIONS[decision].done);
    } catch (err) {
      const body = err.response?.data;
      if (body?.code === 'E405') {
        // Numbers changed since the dialog opened (e.g. another leave was approved meanwhile)
        setServerManning(body);
        setAcknowledged(false);
        setError('تغيّرت بيانات التواجد منذ فتح الطلب: اعتماده سيؤدي إلى نقص عن الحد الأدنى. راجع التنبيه وأقرّ به للمتابعة.');
      } else if (body?.code === 'E403') {
        setReasonError(body.message);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  let content;
  if (!r) {
    content = detail.error
      ? <Alert severity="error">{detail.error}</Alert>
      : <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  } else {
    content = (
      <Box sx={{ display: 'grid', gap: 2 }}>
        {/* Request summary */}
        <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f5f8f6' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
            <Typography fontWeight={800}>{r.request_type_name}</Typography>
            <PriorityChip priority={r.priority} label={r.priority_display} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{r.request_number}</Typography>
          </Box>
          <Row label="مقدم الطلب">
            {[r.requester.rank, r.requester.full_name].filter(Boolean).join(' ')} — {r.requester.military_id}
          </Row>
          <Row label="الوحدة">{r.requester.unit_name || '—'}</Row>
          {r.date_from && (
            <Row label="الفترة">
              {formatDateRange(r.date_from, r.date_to)} ({daysLabel(daysBetween(r.date_from, r.date_to))})
            </Row>
          )}
          <Row label="السبب">{r.reason || '—'}</Row>
          {r.attachments.length > 0 && (
            <Row label="المرفقات">
              {r.attachments.map((att) => (
                <Box key={att.id} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                  <AttachFileIcon sx={{ fontSize: 16 }} color="action" />
                  {att.file_name}
                  <Tooltip title="معاينة">
                    <IconButton size="small" onClick={() => openAttachment(att, true).catch(() => setError('تعذر فتح المرفق'))}>
                      <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Row>
          )}
        </Box>

        <ManningPanel manning={manning} />

        {!r.can_decide && (
          <Alert severity="info">لم يعد بإمكانك اتخاذ قرار على هذا الطلب، فقد تغيّرت حالته أو مرحلته.</Alert>
        )}

        {r.can_decide && (
          <>
            <ToggleButtonGroup exclusive fullWidth value={decision}
                               onChange={(_, v) => { if (v) { setDecision(v); setReasonError(''); } }}>
              {Object.entries(DECISIONS).map(([key, d]) => (
                <ToggleButton key={key} value={key} color={d.color} sx={{ fontWeight: 700 }}>{d.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>

            <TextField
              fullWidth multiline minRows={2}
              label={needsReason ? 'السبب (مطلوب)' : 'ملاحظة (اختياري)'}
              value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(''); }}
              error={Boolean(reasonError)} helperText={reasonError}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />

            {decision === 'approve' && warning && (
              <FormControlLabel
                control={<Checkbox checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} color="error" />}
                label="اطلعت على تنبيه الحد الأدنى للتواجد، وأوافق على الاعتماد مع تحمّل المسؤولية"
                sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.5 } }}
              />
            )}
          </>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Box>
    );
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle fontWeight={800}>مراجعة الطلب</DialogTitle>
      <DialogContent>{content}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
        {r?.can_decide && (
          <Button variant="contained" color={DECISIONS[decision].color} onClick={submit}
                  disabled={busy || blockedByWarning}>
            {busy ? <CircularProgress size={22} color="inherit" /> : `تأكيد ${DECISIONS[decision].label}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
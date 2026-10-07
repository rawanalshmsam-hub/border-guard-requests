import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, AlertTitle, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, IconButton,
  Snackbar, Stack, Tooltip, Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PersonIcon from '@mui/icons-material/Person';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import api, { getErrorMessage } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import useApi from '../../hooks/useApi';
import ApprovalPath from '../../components/ApprovalPath';
import PageHeader from '../../components/PageHeader';
import PriorityChip from '../../components/PriorityChip';
import SectionTitle from '../../components/SectionTitle';
import StatusChip from '../../components/StatusChip';
import { daysBetween, daysLabel } from '../../utils/dates';
import { ACCEPT, checkFiles, openAttachment } from '../../utils/files';
import { formatDateRange, formatDateTime, formatFileSize } from '../../utils/format';
import CancelDialog from './CancelDialog';
import EditDialog from './EditDialog';
import DecisionDialog from '../review/DecisionDialog';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';





const DECISION_COLORS = {
  APPROVE: { bg: '#e6f4ec', fg: '#1f8a5b' },
  REJECT: { bg: '#fdecec', fg: '#c62828' },
  RETURN: { bg: '#fff4e5', fg: '#b26a00' },
  FORWARD: { bg: '#e8f0fb', fg: '#2f5fa7' },
};

function InfoRow({ label, children }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, py: 1.25, borderBottom: 1, borderColor: 'divider',
               '&:last-of-type': { borderBottom: 0 } }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 120, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
        {children}
      </Typography>
    </Box>
  );
}

function periodText(r) {
  if (!r.date_from) return '—';
  return `${formatDateRange(r.date_from, r.date_to)} (${daysLabel(daysBetween(r.date_from, r.date_to))})`;
}

/** My requests 4.3 / Request details 4.1 — also the page reviewers open (Review 4.2). */
export default function RequestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const detail = useApi(`/requests/${id}/`);
  const [dialog, setDialog] = useState(null);       // 'cancel' | 'edit' | null
  const [toast, setToast] = useState('');
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Go back where the user came from; if the page was opened directly, go to My requests
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/requests'));

  if (!detail.data) {
    if (detail.error) {
      return (
        <Box>
          <PageHeader title="تفاصيل الطلب" onBack={goBack} />
          <Alert severity="error">{detail.error}</Alert>
        </Box>
      );
    }
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const r = detail.data;
  const isOwner = r.requester.military_id === user.military_id;
  const canAddFiles = isOwner && ['PENDING', 'PENDING_EDIT'].includes(r.status);
  const lastReturn = [...r.actions].reverse().find((a) => a.decision === 'RETURN');
  const lastReject = [...r.actions].reverse().find((a) => a.decision === 'REJECT');

  function finished(message) {
    setDialog(null);
    setToast(message);
    detail.reload();
  }

  async function uploadFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const message = checkFiles(r.attachments, incoming);
    if (message) { setFileError(message); return; }
    const form = new FormData();
    incoming.forEach((f) => form.append('files', f));
    setUploading(true);
    setFileError('');
    try {
      await api.post(`/requests/${r.id}/attachments/`, form);   // API 1.2
      finished('تمت إضافة المرفقات');
    } catch (err) {
      setFileError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleOpen(att, inline) {
    setFileError('');
    try {
      await openAttachment(att, inline);
    } catch {
      setFileError('تعذر فتح المرفق، حاول مرة أخرى');
    }
  }

  return (
    <Box>
      <PageHeader title={r.request_type_name} subtitle={`${r.request_number} • ${r.category_name}`} onBack={goBack} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
        <StatusChip status={r.status} label={r.status_display} />
        <PriorityChip priority={r.priority} label={r.priority_display} />
        {!isOwner && r.manning_warning && (
          <Chip size="small" label="⚠️ تنبيه الحد الأدنى للتواجد" sx={{ bgcolor: '#fdecec', color: '#c62828', fontWeight: 700 }} />
        )}
        <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon />}
                onClick={() => navigate(`/requests/${r.id}/print`)} sx={{ ml: 'auto' }}>
          طباعة / حفظ PDF
        </Button>
      </Box>

      {isOwner && r.status === 'PENDING_EDIT' && (
        <Alert severity="warning" sx={{ mb: 2.5 }}
               action={r.can_edit && <Button color="inherit" onClick={() => setDialog('edit')}>تعديل الطلب</Button>}>
          <AlertTitle>أُعيد طلبك للتعديل</AlertTitle>
          {lastReturn?.reason}
        </Alert>
      )}
      {r.status === 'REJECTED' && lastReject && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          <AlertTitle>تم رفض الطلب</AlertTitle>
          {lastReject.reason}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        <Stack spacing={3}>
          {/* Request data */}
          <Card><CardContent>
            <SectionTitle title="تفاصيل الطلب" />
            <InfoRow label="سبب الطلب">{r.reason || '—'}</InfoRow>
            <InfoRow label="الفترة">{periodText(r)}</InfoRow>
            <InfoRow label="الأولوية">{r.priority_display}</InfoRow>
            <InfoRow label="التصنيف">{r.category_name}</InfoRow>
            <InfoRow label="تاريخ التقديم">{formatDateTime(r.created_at)}</InfoRow>
            <InfoRow label="آخر تحديث">{formatDateTime(r.updated_at)}</InfoRow>
          </CardContent></Card>

          {/* Approval path + decision history */}
          <Card><CardContent>
            <SectionTitle title="مسار الاعتماد" />
            <Box sx={{ maxWidth: 560, mb: 2.5 }}><ApprovalPath steps={r.approval_path} /></Box>
            <Typography fontWeight={700} sx={{ mb: 1 }}>سجل القرارات</Typography>
            {r.actions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">لم يُتخذ أي قرار بعد</Typography>
            ) : (
              <Stack spacing={1.5}>
                {r.actions.map((a) => {
                  const c = DECISION_COLORS[a.decision] || DECISION_COLORS.FORWARD;
                  return (
                    <Box key={a.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f5f8f6' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip size="small" label={a.decision_display} sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 700 }} />
                        <Typography variant="body2" fontWeight={700}>
                          {[a.approver_rank, a.approver_name].filter(Boolean).join(' ')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {formatDateTime(a.action_date)}
                        </Typography>
                      </Box>
                      {a.reason && <Typography variant="body2" sx={{ mt: 0.75 }}>{a.reason}</Typography>}
                      {a.manning_acknowledged && (
                        <Chip size="small" variant="outlined" color="warning" sx={{ mt: 1 }}
                              label="⚠️ أقرّ المعتمد بتنبيه الحد الأدنى للتواجد" />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent></Card>

          {/* Attachments (protected download) */}
          <Card><CardContent>
            <SectionTitle title="المرفقات" />
            {r.attachments.length === 0 && (
              <Typography variant="body2" color="text.secondary">لا توجد مرفقات</Typography>
            )}
            <Stack spacing={1}>
              {r.attachments.map((att) => (
                <Box key={att.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, borderRadius: 2, bgcolor: '#f5f8f6' }}>
                  <AttachFileIcon fontSize="small" color="action" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{att.file_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {att.file_size ? `${formatFileSize(att.file_size)} • ` : ''}{formatDateTime(att.uploaded_at)}
                    </Typography>
                  </Box>
                  <Tooltip title="معاينة">
                    <IconButton size="small" onClick={() => handleOpen(att, true)}><VisibilityOutlinedIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="تنزيل">
                    <IconButton size="small" onClick={() => handleOpen(att, false)}><FileDownloadOutlinedIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
            {canAddFiles && (
              <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />}
                      disabled={uploading} sx={{ mt: 1.5 }}>
                {uploading ? 'جاري الرفع...' : 'إضافة مرفقات'}
                <input hidden type="file" multiple accept={ACCEPT}
                       onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
              </Button>
            )}
            {fileError && <Alert severity="error" sx={{ mt: 1.5 }}>{fileError}</Alert>}
          </CardContent></Card>
        </Stack>

        <Stack spacing={3}>
          {/* Requester */}
          <Card><CardContent>
            <SectionTitle title="مقدم الطلب" />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.light', color: '#5e35b1' }}><PersonIcon /></Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={800} noWrap>{r.requester.full_name}</Typography>
                <Typography variant="caption" color="text.secondary">{r.requester.rank}</Typography>
              </Box>
            </Box>
            <InfoRow label="الرقم العسكري">{r.requester.military_id}</InfoRow>
            <InfoRow label="الوحدة">{r.requester.unit_name || '—'}</InfoRow>
            <InfoRow label="الموقع">{r.requester.site_name || '—'}</InfoRow>
          </CardContent></Card>
                    {/* Reviewer: this request is waiting for my decision */}
          {r.can_decide && (
            <Card sx={{ borderColor: 'primary.main' }}><CardContent>
              <SectionTitle title="اتخاذ القرار" />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                هذا الطلب بانتظار قرارك في المرحلة الحالية.
              </Typography>
              <Button fullWidth variant="contained" onClick={() => setDialog('decide')}>مراجعة الطلب</Button>
            </CardContent></Card>
          )}

          {/* Owner actions — shown only when the server allows them */}
          {isOwner && (r.can_edit || r.can_cancel) && (
            <Card><CardContent>
              <SectionTitle title="الإجراءات" />
              <Stack spacing={1.5}>
                {r.can_edit && (
                  <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => setDialog('edit')}>
                    تعديل الطلب
                  </Button>
                )}
                {r.can_cancel && (
                  <Button variant="outlined" color="error" startIcon={<CancelOutlinedIcon />} onClick={() => setDialog('cancel')}>
                    إلغاء الطلب
                  </Button>
                )}
              </Stack>
            </CardContent></Card>
          )}
        </Stack>
      </Box>

      {dialog === 'cancel' && <CancelDialog requestId={r.id} onClose={() => setDialog(null)} onDone={finished} />}
      {dialog === 'edit' && <EditDialog request={r} onClose={() => setDialog(null)} onDone={finished} />}
      {dialog === 'decide' && <DecisionDialog requestId={r.id} onClose={() => setDialog(null)} onDone={finished} />}

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
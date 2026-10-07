import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, GlobalStyles, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { useAuth } from '../../auth/AuthContext';
import useApi from '../../hooks/useApi';
import { daysBetween, daysLabel } from '../../utils/dates';
import { formatDateRange, formatDateTime } from '../../utils/format';

// A4 print style sheet: page size/margins, hide buttons, keep colours, avoid splitting sections
const PRINT_CSS = `
  @page { size: A4; margin: 14mm; }
  @media print {
    body { background: #fff !important; }
    .no-print { display: none !important; }
    .print-sheet { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

const STEP_STATE = {
  done: 'تم',
  current: 'قيد الإجراء',
  waiting: 'بانتظار',
  rejected: 'مرفوض',
  returned: 'معاد للتعديل',
  cancelled: 'ملغى',
};

const TABLE = {
  width: '100%', borderCollapse: 'collapse', fontSize: 12.5,
  '& th, & td': { border: '1px solid #cfd8d3', p: '6px 8px', textAlign: 'start', verticalAlign: 'top' },
  '& th': { bgcolor: '#f1f5f3', fontWeight: 700, whiteSpace: 'nowrap' },
};

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 2.5, breakInside: 'avoid' }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1, pb: 0.5, borderBottom: '2px solid #1f8a5b' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function KeyValueTable({ rows }) {
  return (
    <Box component="table" sx={TABLE}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th style={{ width: '28%' }}>{label}</th>
            <td>{value || '—'}</td>
          </tr>
        ))}
      </tbody>
    </Box>
  );
}

/** Request details 4.3 (export PDF) + My requests 4.5 (print view) — one printable page. */
export default function RequestPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const detail = useApi(`/requests/${id}/`);

  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(`/requests/${id}`));

  if (!detail.data) {
    return (
      <Box sx={{ p: 4 }}>
        {detail.error ? <Alert severity="error">{detail.error}</Alert> : <CircularProgress />}
      </Box>
    );
  }

  const r = detail.data;
  const period = r.date_from
    ? `${formatDateRange(r.date_from, r.date_to)} (${daysLabel(daysBetween(r.date_from, r.date_to))})`
    : '—';

  return (
    <Box sx={{ bgcolor: '#eef2f0', minHeight: '100vh', py: 3, px: 1 }}>
      <GlobalStyles styles={PRINT_CSS} />

      {/* toolbar — hidden when printing */}
      <Box className="no-print" sx={{ maxWidth: '210mm', mx: 'auto', mb: 2, display: 'flex', gap: 1 }}>
        <Button startIcon={<ArrowForwardIcon />} onClick={back}>رجوع</Button>
        <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()} sx={{ ml: 'auto' }}>
          طباعة / حفظ PDF
        </Button>
      </Box>

      {/* the A4 sheet */}
      <Box className="print-sheet" sx={{
        width: '210mm', maxWidth: '100%', mx: 'auto', bgcolor: '#fff', color: '#111', p: '14mm',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)', boxSizing: 'border-box',
      }}>
        {/* header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pb: 1.5, mb: 2.5, borderBottom: '3px solid #0f3b2c' }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#0f3b2c' }}>حرس الحدود</Typography>
            <Typography sx={{ fontSize: 13 }}>منصة طلبات منسوبي حرس الحدود</Typography>
          </Box>
          <Box sx={{ ml: 'auto', textAlign: 'end' }}>
            <Typography sx={{ fontSize: 12, color: '#555' }}>رقم الطلب</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 16, direction: 'ltr' }}>{r.request_number}</Typography>
          </Box>
        </Box>

        <Typography sx={{ fontWeight: 800, fontSize: 17, textAlign: 'center', mb: 2.5 }}>
          نموذج طلب: {r.request_type_name}
        </Typography>

        <Section title="بيانات الطلب">
          <KeyValueTable rows={[
            ['التصنيف', r.category_name],
            ['نوع الطلب', r.request_type_name],
            ['الحالة', r.status_display],
            ['الأولوية', r.priority_display],
            ['الفترة', period],
            ['تاريخ التقديم', formatDateTime(r.created_at)],
            ['آخر تحديث', formatDateTime(r.updated_at)],
          ]} />
        </Section>

        <Section title="بيانات مقدم الطلب">
          <KeyValueTable rows={[
            ['الاسم', r.requester.full_name],
            ['الرتبة', r.requester.rank],
            ['الرقم العسكري', r.requester.military_id],
            ['الوحدة', r.requester.unit_name],
            ['الموقع', r.requester.site_name],
          ]} />
        </Section>

        <Section title="سبب الطلب">
          <Box sx={{ border: '1px solid #cfd8d3', p: 1.25, fontSize: 13, whiteSpace: 'pre-wrap', minHeight: 48 }}>
            {r.reason || '—'}
          </Box>
        </Section>

        <Section title="مسار الاعتماد">
          <Box component="table" sx={TABLE}>
            <thead><tr><th style={{ width: 40 }}>#</th><th>المرحلة</th><th>الحالة</th></tr></thead>
            <tbody>
              {r.approval_path.map((step, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{step.label}</td>
                  <td>{STEP_STATE[step.state] || step.state}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Section>

        <Section title="سجل القرارات">
          {r.actions.length === 0 ? (
            <Typography sx={{ fontSize: 13 }}>لم يُتخذ أي قرار بعد.</Typography>
          ) : (
            <Box component="table" sx={TABLE}>
              <thead>
                <tr><th>المعتمد</th><th>القرار</th><th>السبب / الملاحظة</th><th>التاريخ</th><th>إقرار الحد الأدنى</th></tr>
              </thead>
              <tbody>
                {r.actions.map((a) => (
                  <tr key={a.id}>
                    <td>{[a.approver_rank, a.approver_name].filter(Boolean).join(' ')}</td>
                    <td>{a.decision_display}</td>
                    <td>{a.reason || '—'}</td>
                    <td>{formatDateTime(a.action_date)}</td>
                    <td>{a.manning_acknowledged ? 'نعم — أقرّ بتنبيه الحد الأدنى' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          )}
        </Section>

        <Section title="المرفقات">
          {r.attachments.length === 0 ? (
            <Typography sx={{ fontSize: 13 }}>لا توجد مرفقات.</Typography>
          ) : (
            <Box component="ol" sx={{ m: 0, pl: 3, fontSize: 13 }}>
              {r.attachments.map((att) => <li key={att.id}>{att.file_name}</li>)}
            </Box>
          )}
        </Section>

        {/* footer */}
        <Box sx={{ mt: 4, pt: 1.5, borderTop: '1px solid #cfd8d3', display: 'flex', gap: 2, fontSize: 11, color: '#555' }}>
          <span>طُبع بواسطة: {[user.rank, user.full_name].filter(Boolean).join(' ')}</span>
          <span style={{ marginRight: 'auto' }}>{formatDateTime(new Date().toISOString())}</span>
        </Box>
        <Typography sx={{ fontSize: 10.5, color: '#777', mt: 0.5 }}>
          هذه النسخة مستخرجة من المنصة الإلكترونية، والمرجع هو السجل الإلكتروني للطلب.
        </Typography>
      </Box>
    </Box>
  );
}
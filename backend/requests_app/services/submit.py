import uuid
from datetime import date

from django.db import transaction
from django.utils import timezone

from accounts.services import log_action
from config.errors import ServiceError
from notifications.services import notify, notify_many
from requests_app.models import Request, RequestType

from .attachments import save_attachments, validate_files
from .manning import manning_check
from .workflow import get_approvers, get_step

OPEN_STATUSES = [Request.Status.PENDING, Request.Status.PENDING_EDIT, Request.Status.APPROVED]
MAX_RANGE_DAYS = 365


# ---------- shared helpers (used by submit and edit) ----------

def _parse_date(value, field, label):
    if not value:
        raise ServiceError('E201', f'{label} مطلوب', field=field)
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        raise ServiceError('E201', f'{label} غير صحيح', field=field)


def validate_fields(request_type, data):
    """Mandatory fields per type. Returns a dict of clean values (E201 on error)."""
    reason = str(data.get('reason', '')).strip()
    if not reason:
        raise ServiceError('E201', 'سبب الطلب مطلوب', field='reason')
    if len(reason) > 1000:
        raise ServiceError('E201', 'سبب الطلب يجب ألا يتجاوز 1000 حرف', field='reason')

    priority = data.get('priority') or Request.Priority.NORMAL
    if priority not in Request.Priority.values:
        raise ServiceError('E201', 'الأولوية غير صحيحة', field='priority')

    date_from = date_to = None
    if request_type.requires_dates:
        date_from = _parse_date(data.get('date_from'), 'date_from', 'تاريخ البداية')
        date_to = _parse_date(data.get('date_to'), 'date_to', 'تاريخ النهاية')
        if date_to < date_from:
            raise ServiceError('E201', 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية أو مساوياً له', field='date_to')
        if (date_to - date_from).days + 1 > MAX_RANGE_DAYS:
            raise ServiceError('E201', f'مدة الطلب لا يمكن أن تتجاوز {MAX_RANGE_DAYS} يوماً', field='date_to')

    return {'reason': reason, 'priority': priority, 'date_from': date_from, 'date_to': date_to}


def check_overlap(user, request_type, date_from, date_to, exclude_pk=None):
    """E203 if the same person has an overlapping (dated) or duplicate (undated) open request."""
    mine = Request.objects.filter(user=user, status__in=OPEN_STATUSES)
    if exclude_pk is not None:
        mine = mine.exclude(pk=exclude_pk)
    if date_from:
        clash = mine.filter(date_from__lte=date_to, date_to__gte=date_from).first()
    else:
        clash = mine.filter(request_type=request_type).exclude(status=Request.Status.APPROVED).first()
    if clash:
        raise ServiceError('E203', f'يوجد طلب آخر متداخل أو مكرر: {clash.request_number}')


def approvers_for_step(req, site):
    """Users who must act on the request's current step (E205 if nobody can)."""
    step = get_step(req.request_type, req.current_step)
    if step is None:
        raise ServiceError('E205', 'لا يوجد مسار اعتماد لهذا النوع من الطلبات')
    approvers = get_approvers(step.approver_role, site, exclude_user=req.user)
    if not approvers:
        raise ServiceError('E205', 'لا يوجد معتمد متاح لهذا الطلب في موقعك')
    return approvers


# ---------- API 1.1 ----------

@transaction.atomic
def submit_request(user, data, files):
    """
    Validate, create, run manning check, notify, audit — all in one transaction.
    Returns (request, manning_result or None).
    """
    if not user.is_active or user.unit_id is None:
        raise ServiceError('E202', 'حسابك غير مرتبط بوحدة نشطة، راجع مدير النظام')
    site = user.unit.site

    try:
        request_type = RequestType.objects.get(pk=int(data.get('request_type')))
    except (TypeError, ValueError, RequestType.DoesNotExist):
        raise ServiceError('E202', 'نوع الطلب غير صحيح', field='request_type')

    # Check the chain before creating anything
    first_step = get_step(request_type, 1)
    if first_step is None:
        raise ServiceError('E205', 'لا يوجد مسار اعتماد لهذا النوع من الطلبات')
    approvers = get_approvers(first_step.approver_role, site, exclude_user=user)
    if not approvers:
        raise ServiceError('E205', 'لا يوجد معتمد متاح لهذا الطلب في موقعك')

    fields = validate_fields(request_type, data)

    if request_type.requires_attachment and not files:
        raise ServiceError('E204', 'هذا الطلب يتطلب إرفاق مستند', field='files')
    validate_files(files)

    check_overlap(user, request_type, fields['date_from'], fields['date_to'])

    req = Request.objects.create(
        request_number=f'TMP-{uuid.uuid4().hex[:20]}',
        user=user, request_type=request_type,
        status=Request.Status.PENDING, current_step=1, **fields,
    )
    req.request_number = f'REQ-{timezone.localdate().year}-{req.pk:06d}'

    manning = None
    if request_type.is_leave_type and req.date_from:
        manning = manning_check(site, req.date_from, req.date_to, requester=user, request=req, checked_by=user)
        req.manning_warning = manning.is_below_minimum
    req.save(update_fields=['request_number', 'manning_warning', 'updated_at'])

    save_attachments(req, files)

    notify(user, f'تم استلام طلبك رقم {req.request_number} وهو قيد المراجعة', req)
    message = f'طلب جديد بانتظار مراجعتك: {req.request_number} — {request_type.name} من {user.rank} {user.full_name}'
    if req.manning_warning:
        message += ' ⚠️ قد يؤدي اعتماده إلى نقص عن الحد الأدنى'
    notify_many(approvers, message, req)

    log_action(user, 'SUBMIT_REQUEST', req,
               request_number=req.request_number,
               manning_warning=req.manning_warning,
               affected_dates=manning.affected_dates if manning else [])
    return req, manning
from django.db import transaction

from accounts.services import log_action
from config.errors import ServiceError
from notifications.services import notify_many
from requests_app.models import Request

from .manning import manning_check
from .submit import approvers_for_step, check_overlap, validate_fields

S = Request.Status


def _load_own(user, pk):
    req = (Request.objects.select_for_update()
           .select_related('request_type', 'user__unit__site')
           .filter(pk=pk, user=user).first())
    if req is None:
        raise ServiceError('E202', 'الطلب غير موجود', status=404)
    return req


def _snapshot(req):
    """JSON-safe copy of the editable fields, for the audit log."""
    return {
        'reason': req.reason,
        'priority': req.priority,
        'date_from': req.date_from.isoformat() if req.date_from else None,
        'date_to': req.date_to.isoformat() if req.date_to else None,
    }


@transaction.atomic
def edit_request(user, pk, data):
    """Request details 2.1 — owner edits a request that was RETURNED (PENDING_EDIT)."""
    req = _load_own(user, pk)
    if req.status != S.PENDING_EDIT:
        raise ServiceError('E202', 'لا يمكن تعديل الطلب إلا بعد إعادته للتعديل من المعتمد')

    rtype = req.request_type
    if 'request_type' in data and str(data.get('request_type')) != str(rtype.pk):
        raise ServiceError('E201', 'لا يمكن تغيير نوع الطلب، ألغِ الطلب وقدّم طلباً جديداً', field='request_type')

    fields = validate_fields(rtype, data)
    check_overlap(user, rtype, fields['date_from'], fields['date_to'], exclude_pk=req.pk)
    if rtype.requires_attachment and not req.attachments.exists():
        raise ServiceError('E204', 'هذا الطلب يتطلب إرفاق مستند', field='files')

    site = req.user.unit.site
    approvers = approvers_for_step(req, site)   # same step that returned it

    old = _snapshot(req)
    for name, value in fields.items():
        setattr(req, name, value)
    req.status = S.PENDING

    manning = None
    if rtype.is_leave_type and req.date_from:
        manning = manning_check(site, req.date_from, req.date_to, requester=user, request=req, checked_by=user)
        req.manning_warning = manning.is_below_minimum
    req.save()

    message = f'تم تعديل الطلب {req.request_number} وإعادته لمراجعتك'
    if req.manning_warning:
        message += ' ⚠️ قد يؤدي اعتماده إلى نقص عن الحد الأدنى'
    notify_many(approvers, message, req)

    log_action(user, 'EDIT_REQUEST', req, old=old, new=_snapshot(req),
               manning_warning=req.manning_warning)
    return req


@transaction.atomic
def cancel_request(user, pk, reason=''):
    """Request details 3.1 — soft cancel: status becomes CANCELLED, nothing is deleted."""
    req = _load_own(user, pk)
    if req.status not in (S.PENDING, S.PENDING_EDIT):
        raise ServiceError('E202', 'لا يمكن إلغاء طلب بهذه الحالة')

    previous = req.status
    req.status = S.CANCELLED
    req.save(update_fields=['status', 'updated_at'])

    # Tell the approver who was waiting on it (only if it was in their queue)
    if previous == S.PENDING:
        try:
            approvers = approvers_for_step(req, req.user.unit.site)
        except ServiceError:
            approvers = []
        notify_many(approvers, f'تم إلغاء الطلب {req.request_number} من قبل مقدمه', req)

    log_action(user, 'CANCEL_REQUEST', req, previous_status=previous, reason=reason)
    return req
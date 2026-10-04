from django.db import transaction
from django.db.models import Case, Exists, IntegerField, OuterRef, Q, Value, When

from accounts.services import log_action
from config.errors import ServiceError
from notifications.services import notify, notify_many
from requests_app.models import ApprovalAction, ApprovalChainStep, Request

from .manning import manning_check
from .workflow import get_approvers, get_step, is_current_approver

S = Request.Status
D = ApprovalAction.Decision
REVIEWER_ROLES = ('OFFICER', 'FINANCE', 'ADMIN')
REVIEW_TABS = ('all', 'new', 'under_review', 'awaiting')


def manning_payload(res):
    """JSON-safe manning result for the API."""
    return {
        'result': res.result,
        'below_minimum': res.is_below_minimum,
        'affected_dates': res.affected_dates,
        'total_personnel': res.total_personnel,
        'minimum': res.minimum,
        'error_code': res.error_code,
    }


# ---------- Review 4.1: the reviewer's list ----------

def review_queryset(user, tab='all'):
    if user.role not in REVIEWER_ROLES:
        raise ServiceError('E401', 'هذه الصفحة متاحة لأصحاب صلاحيات الاعتماد فقط', status=403)
    if tab not in REVIEW_TABS:
        raise ServiceError('E201', 'قيمة التبويب غير صحيحة', field='tab')

    steps = ApprovalChainStep.objects.filter(request_type=OuterRef('request_type'), approver_role=user.role)
    my_turn = Exists(steps.filter(step_order=OuterRef('current_step')))
    passed_me = Exists(steps.filter(step_order__lt=OuterRef('current_step')))
    has_actions = Exists(ApprovalAction.objects.filter(request=OuterRef('pk')))

    qs = (Request.objects.filter(status=S.PENDING).exclude(user=user)
          .annotate(my_turn=my_turn, passed_me=passed_me, has_actions=has_actions)
          .select_related('user__unit', 'request_type__category'))

    if user.role != 'ADMIN':
        if user.unit_id is None:
            return qs.none()
        qs = qs.filter(user__unit__site_id=user.unit.site_id)

    if tab == 'new':
        qs = qs.filter(my_turn=True, has_actions=False)
    elif tab == 'under_review':
        qs = qs.filter(my_turn=True, has_actions=True)
    elif tab == 'awaiting':
        qs = qs.filter(my_turn=False, passed_me=True)
    else:
        qs = qs.filter(Q(my_turn=True) | Q(passed_me=True))

    priority_rank = Case(
        When(priority=Request.Priority.EMERGENCY, then=Value(0)),
        When(priority=Request.Priority.URGENT, then=Value(1)),
        default=Value(2), output_field=IntegerField(),
    )
    # actionable first, then emergency > urgent > normal, then oldest first
    return qs.annotate(priority_rank=priority_rank).order_by('-my_turn', 'priority_rank', 'created_at')


# ---------- Review 2.1 / 2.2 / 2.3: decisions ----------

def _lock(pk):
    return (Request.objects.select_for_update()
            .select_related('request_type', 'user__unit__site')
            .filter(pk=pk).first())


def decide_request(user, pk, decision, reason='', acknowledged=False):
    reason = (reason or '').strip()

    # Phase 1 — validate + (for leave approvals) live manning check, committed on its own
    # so the check stays logged even if the approval is refused for missing acknowledgement.
    with transaction.atomic():
        req = _lock(pk)
        if req is None:
            raise ServiceError('E202', 'الطلب غير موجود', status=404)
        if req.status != S.PENDING:
            raise ServiceError('E402', 'لا يمكن اتخاذ قرار على طلب بهذه الحالة')
        if not is_current_approver(user, req):
            raise ServiceError('E401', 'غير مخوّل باتخاذ قرار على هذا الطلب في مرحلته الحالية', status=403)
        if decision not in (D.APPROVE, D.REJECT, D.RETURN):
            raise ServiceError('E402', 'قرار غير صالح')
        if decision in (D.REJECT, D.RETURN) and not reason:
            raise ServiceError('E403', 'يجب كتابة سبب الرفض أو الإعادة للتعديل', field='reason')

        site = req.user.unit.site if req.user.unit else None
        manning = None
        if decision == D.APPROVE and req.request_type.is_leave_type and req.date_from:
            manning = manning_check(site, req.date_from, req.date_to,
                                    requester=req.user, request=req, checked_by=user)
            req.manning_warning = manning.is_below_minimum
            req.save(update_fields=['manning_warning', 'updated_at'])

    warning = manning is not None and manning.is_below_minimum
    if warning and not acknowledged:
        # E405 — added beyond pseudocode
        raise ServiceError('E405', 'اعتماد هذا الطلب سيؤدي إلى نقص عن الحد الأدنى للتواجد، يجب الإقرار بالتنبيه قبل الاعتماد',
                           status=409, field='manning_acknowledged', extra=manning_payload(manning))

    # Phase 2 — apply the decision
    with transaction.atomic():
        req = _lock(pk)
        if req.status != S.PENDING or not is_current_approver(user, req):
            raise ServiceError('E402', 'تغيّرت حالة الطلب، أعد تحميل الصفحة', status=409)

        step = get_step(req.request_type, req.current_step)
        step_label = step.get_approver_role_display()
        number = req.request_number

        ApprovalAction.objects.create(
            request=req, approver=user, decision=decision, reason=reason,
            manning_acknowledged=warning and acknowledged,
        )

        if decision == D.APPROVE:
            next_step = get_step(req.request_type, req.current_step + 1)
            if next_step:
                approvers = get_approvers(next_step.approver_role, site, exclude_user=req.user)
                if not approvers:
                    raise ServiceError('E205', 'لا يوجد معتمد متاح للمرحلة التالية')
                req.current_step += 1
                req.save(update_fields=['current_step', 'updated_at'])
                message = f'طلب بانتظار اعتمادك: {number} — {req.request_type.name} (اعتمده {step_label})'
                if req.manning_warning:
                    message += ' ⚠️ تنبيه الحد الأدنى'
                notify_many(approvers, message, req)
                notify(req.user, f'تم اعتماد طلبك {number} من {step_label} وانتقل إلى {next_step.get_approver_role_display()}', req)
            else:
                req.status = S.APPROVED
                req.save(update_fields=['status', 'updated_at'])
                notify(req.user, f'تم اعتماد طلبك {number} نهائياً', req)

        elif decision == D.REJECT:
            req.status = S.REJECTED
            req.save(update_fields=['status', 'updated_at'])
            notify(req.user, f'تم رفض طلبك {number}. السبب: {reason}', req)

        else:  # RETURN
            req.status = S.PENDING_EDIT
            req.save(update_fields=['status', 'updated_at'])
            notify(req.user, f'أُعيد طلبك {number} للتعديل. السبب: {reason}', req)

        log_action(user, f'DECIDE_{decision}', req,
                   step=step.step_order, reason=reason,
                   manning_warning=req.manning_warning,
                   manning_acknowledged=warning and acknowledged,
                   affected_dates=manning.affected_dates if manning else [])
    return req
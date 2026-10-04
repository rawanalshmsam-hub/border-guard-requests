from django.db.models import Count

from requests_app.models import Request

S = Request.Status
UNDER_REVIEW = [S.PENDING, S.PENDING_EDIT]
APPROVED = [S.APPROVED, S.COMPLETED]
REJECTED = [S.REJECTED]
CANCELLED = [S.CANCELLED]

# ?status= filter values (same groups as the stat cards)
STATUS_GROUPS = {
    'under_review': UNDER_REVIEW,
    'approved': APPROVED,
    'rejected': REJECTED,
    'cancelled': CANCELLED,
}

# Archive = closed requests: no further action is possible
ARCHIVE_STATUSES = APPROVED + REJECTED + CANCELLED


def requests_summary(user):
    """Home 4.2 — counts for the three stat cards (CANCELLED is not counted)."""
    rows = Request.objects.filter(user=user).values('status').annotate(n=Count('id'))
    counts = {row['status']: row['n'] for row in rows}

    def total(statuses):
        return sum(counts.get(s, 0) for s in statuses)

    return {
        'under_review': total(UNDER_REVIEW),
        'approved': total(APPROVED),
        'rejected': total(REJECTED),
    }


def approval_path(req):
    """
    Mini approval path for one request:
    requester (always done) + one dot per chain step.
    state: done / current / waiting / rejected / returned / cancelled
    """
    path = [{'label': 'مقدم الطلب', 'role': None, 'state': 'done'}]
    current_state = {
        S.REJECTED: 'rejected',
        S.PENDING_EDIT: 'returned',
        S.CANCELLED: 'cancelled',
    }.get(req.status, 'current')

    for step in req.request_type.chain_steps.all():
        if req.status in APPROVED or step.step_order < req.current_step:
            state = 'done'
        elif step.step_order == req.current_step:
            state = current_state
        else:
            state = 'waiting'
        path.append({'label': step.get_approver_role_display(), 'role': step.approver_role, 'state': state})
    return path


def recent_requests(user, limit=1):
    """Home 4.4 — the user's latest requests (default 1, as in the design)."""
    return (Request.objects.filter(user=user)
            .select_related('request_type__category')
            .prefetch_related('request_type__chain_steps')
            .order_by('-created_at')[:limit])
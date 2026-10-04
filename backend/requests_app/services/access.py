from django.contrib.auth import get_user_model

from config.errors import ServiceError
from requests_app.models import Request


def can_view_request(user, req):
    """
    Who may open a request:
    - the requester
    - ADMIN (system-wide)
    - an approver whose role is in this type's chain AND who is at the requester's site
    """
    User = get_user_model()
    if req.user_id == user.pk or user.role == User.Role.ADMIN:
        return True
    chain_roles = {step.approver_role for step in req.request_type.chain_steps.all()}
    if user.role not in chain_roles or user.unit_id is None or req.user.unit_id is None:
        return False
    return user.unit.site_id == req.user.unit.site_id


def get_request_for_user(user, pk):
    """Load one request with everything the details page needs, or 404 (E202)."""
    req = (Request.objects
           .select_related('user__unit__site', 'request_type__category')
           .prefetch_related('request_type__chain_steps', 'attachments', 'actions__approver')
           .filter(pk=pk).first())
    if req is None or not can_view_request(user, req):
        # same answer for "doesn't exist" and "not yours": don't reveal other people's requests
        raise ServiceError('E202', 'الطلب غير موجود', status=404)
    return req
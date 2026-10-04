from django.contrib.auth import get_user_model

from requests_app.models import ApprovalChainStep


def get_step(request_type, order):
    """The approval step with this order for this request type, or None."""
    return ApprovalChainStep.objects.filter(request_type=request_type, step_order=order).first()


def get_approvers(role, site, exclude_user=None):
    """
    Active users with this role who can act on the step.
    OFFICER / FINANCE: same site as the requester. ADMIN: system-wide.
    The requester never approves their own request.
    """
    User = get_user_model()
    qs = User.objects.filter(role=role, status=User.Status.ACTIVE)
    if role != User.Role.ADMIN:
        qs = qs.filter(unit__site=site)
    if exclude_user is not None:
        qs = qs.exclude(pk=exclude_user.pk)
    return list(qs)
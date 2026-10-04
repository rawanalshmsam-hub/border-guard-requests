"""
Minimum manning check — the key feature.
Advisory only: it never blocks a request; it returns a warning and logs every check.
"""
import logging
from dataclasses import dataclass, field
from datetime import timedelta

from django.contrib.auth import get_user_model

from requests_app.models import ManningCheckLog, Request

logger = logging.getLogger(__name__)

OK = ManningCheckLog.Result.OK
BELOW = ManningCheckLog.Result.BELOW_MINIMUM
ABSENT_STATUSES = [Request.Status.APPROVED, Request.Status.COMPLETED]


@dataclass
class ManningResult:
    result: str
    affected_dates: list = field(default_factory=list)
    total_personnel: int = 0
    minimum: int = 0
    error_code: str | None = None   # E301 / E302 when the check could not run normally

    @property
    def is_below_minimum(self):
        return self.result == BELOW


def manning_check(site, date_from, date_to, requester=None, request=None, checked_by=None):
    """
    For each day in [date_from, date_to]:
        present = active personnel of the site
                  - people on approved leave that day
                  - the requester (the pending request being checked)
    Days where present < site minimum go into affected_dates.
    Fail-safe: any error -> BELOW_MINIMUM, so the officer must review manually.
    """
    try:
        if site is None or site.minimum_manning_threshold is None:
            res = ManningResult(BELOW, error_code='E302')        # site configuration missing
        else:
            res = _calculate(site, date_from, date_to, requester, request)
    except Exception:
        logger.exception('manning_check failed')
        res = ManningResult(BELOW, error_code='E301')            # manning data unavailable

    if site is not None:
        ManningCheckLog.objects.create(
            site=site, request=request, checked_by=checked_by,
            date_from=date_from, date_to=date_to,
            result=res.result, affected_dates=res.affected_dates,
        )
    return res


def _calculate(site, date_from, date_to, requester, request):
    User = get_user_model()
    total = User.objects.filter(unit__site=site, status=User.Status.ACTIVE).count()

    # One query: all approved leaves at this site that overlap the period
    leaves = Request.objects.filter(
        user__unit__site=site,
        user__status=User.Status.ACTIVE,
        request_type__is_leave_type=True,
        status__in=ABSENT_STATUSES,
        date_from__lte=date_to,
        date_to__gte=date_from,
    )
    if request is not None and request.pk:
        leaves = leaves.exclude(pk=request.pk)
    leaves = list(leaves.values_list('user_id', 'date_from', 'date_to'))

    affected = []
    day = date_from
    while day <= date_to:
        absent = {uid for uid, d_from, d_to in leaves if d_from <= day <= d_to}
        if requester is not None:
            absent.add(requester.pk)   # the pending request counts as absent
        if total - len(absent) < site.minimum_manning_threshold:
            affected.append(day.isoformat())
        day += timedelta(days=1)

    return ManningResult(
        result=BELOW if affected else OK,
        affected_dates=affected,
        total_personnel=total,
        minimum=site.minimum_manning_threshold,
    )
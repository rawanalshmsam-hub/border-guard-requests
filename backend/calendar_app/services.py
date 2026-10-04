"""
Calendar (option b):
- Soldiers / finance: only their own events.
- Officers / admins: own events + APPROVED leaves of people at THEIR site only.
- Other people's events show only name, rank, dates and "leave" (no reason, no request details).
"""
import calendar as pycal
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from config.errors import ServiceError
from requests_app.models import Request

from .models import DutyRoster

EVENT_TYPES = ('all', 'leave', 'return', 'shift', 'course', 'mission', 'medical')
LEADER_ROLES = ('OFFICER', 'ADMIN')
LEAVE_STATUSES = [Request.Status.APPROVED, Request.Status.COMPLETED]


def is_leader(user):
    return user.role in LEADER_ROLES and user.unit_id is not None


def parse_type(value):
    value = value or 'all'
    if value not in EVENT_TYPES:
        raise ServiceError('E201', 'نوع الحدث غير صحيح', field='type')
    return value


def parse_month(year, month):
    today = timezone.localdate()
    try:
        y = int(year) if year else today.year
        m = int(month) if month else today.month
    except ValueError:
        raise ServiceError('E201', 'الشهر أو السنة غير صحيحة', field='month')
    if not (2000 <= y <= 2100 and 1 <= m <= 12):
        raise ServiceError('E201', 'الشهر أو السنة غير صحيحة', field='month')
    return y, m


def _person(user):
    return {'full_name': user.full_name, 'rank': user.rank}


# ---------- data sources ----------

def _leaves(user, start, end):
    """Approved leaves overlapping [start, end] that this viewer may see."""
    qs = (Request.objects
          .filter(request_type__is_leave_type=True, status__in=LEAVE_STATUSES,
                  date_from__lte=end, date_to__gte=start)
          .select_related('user', 'request_type'))
    if is_leader(user):
        qs = qs.filter(Q(user=user) | Q(user__unit__site_id=user.unit.site_id))
    else:
        qs = qs.filter(user=user)
    return list(qs.order_by('date_from'))


def _leave_event(req, viewer):
    mine = req.user_id == viewer.pk
    event = {
        'type': 'leave',
        'title': 'إجازة',
        'date_from': req.date_from.isoformat(),
        'date_to': req.date_to.isoformat(),
        'is_mine': mine,
        'person': _person(req.user),
    }
    if mine:  # request details only for the owner
        event.update({
            'request_id': req.pk,
            'request_number': req.request_number,
            'request_type_name': req.request_type.name,
        })
    return event


def _return_events(user, start, end):
    """Own next return date from DUTY_ROSTER."""
    rows = DutyRoster.objects.filter(user=user, next_return_date__range=(start, end))
    return [{
        'type': 'return',
        'title': 'موعد العودة',
        'date_from': r.next_return_date.isoformat(),
        'date_to': r.next_return_date.isoformat(),
        'is_mine': True,
        'person': _person(user),
        'notes': r.notes,
    } for r in rows]


def _events(user, start, end, event_type):
    events = []
    if event_type in ('all', 'leave'):
        events += [_leave_event(r, user) for r in _leaves(user, start, end)]
    if event_type in ('all', 'return'):
        events += _return_events(user, start, end)
    # shift / course / mission / medical: no data source yet (CALENDAR_EVENTS not built) -> empty
    events.sort(key=lambda e: e['date_from'])
    return events


def _manning_summary(user, start, end):
    """Leaders only: per-day count of approved leaves vs. the site minimum (display only, not logged)."""
    User = get_user_model()
    site = user.unit.site
    total = User.objects.filter(unit__site=site, status=User.Status.ACTIVE).count()
    leaves = [r for r in _leaves(user, start, end) if r.user.status == User.Status.ACTIVE]

    days = {}
    day = start
    while day <= end:
        on_leave = {r.user_id for r in leaves if r.date_from <= day <= r.date_to}
        present = total - len(on_leave)
        days[day.isoformat()] = {
            'on_leave': len(on_leave),
            'present': present,
            'below_minimum': present < site.minimum_manning_threshold,
        }
        day += timedelta(days=1)

    return {'site_name': site.name, 'total_personnel': total,
            'minimum': site.minimum_manning_threshold, 'days': days}


# ---------- API services ----------

def month_view(user, year=None, month=None, event_type=None):
    """Calendar 4.1-4.3 / Home 4.6"""
    y, m = parse_month(year, month)
    t = parse_type(event_type)
    first_weekday_mon0, days_in_month = pycal.monthrange(y, m)
    start, end = date(y, m, 1), date(y, m, days_in_month)

    return {
        'year': y,
        'month': m,
        'days_in_month': days_in_month,
        'first_weekday': (first_weekday_mon0 + 1) % 7,   # 0 = Sunday ... 6 = Saturday
        'type': t,
        'events': _events(user, start, end, t),
        'manning': _manning_summary(user, start, end) if is_leader(user) else None,
    }


def upcoming_events(user, event_type=None, limit=5):
    """Calendar 4.4 / Home 4.7 — ongoing and future events, nearest first."""
    t = parse_type(event_type)
    today = timezone.localdate()
    return _events(user, today, today + timedelta(days=365), t)[:limit]
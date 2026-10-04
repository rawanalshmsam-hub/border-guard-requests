"""Manual check of the calendar APIs (safe to run more than once)."""
from datetime import date

from django.test import Client
from django.test.utils import setup_test_environment
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from calendar_app.models import DutyRoster

setup_test_environment()
c = Client()


def auth(mid):
    token = RefreshToken.for_user(User.objects.get(military_id=mid)).access_token
    return {'HTTP_AUTHORIZATION': f'Bearer {token}'}


def get(url, mid):
    r = c.get(url, **auth(mid))
    return r.status_code, r.json()


# test data: a return date for soldier 1001
DutyRoster.objects.filter(user__military_id='1001').update(next_return_date=date(2026, 11, 6))

st, b = get('/api/calendar/month/?year=2026&month=12', '2001')
print('officer 2001, Dec         ', st, 'events:', len(b['events']), '| first_weekday:', b['first_weekday'])
print('   Dec 11 manning         ', b['manning']['days']['2026-12-11'])
other = next(e for e in b['events'] if not e['is_mine'])
print('   other person keys      ', sorted(other.keys()))

st, b = get('/api/calendar/month/?year=2026&month=12', '1002')
print('soldier 1002, Dec         ', st, 'events:', len(b['events']), '| manning:', b['manning'])

st, b = get('/api/calendar/month/?year=2026&month=12', '2101')
print('south officer 2101, Dec   ', st, 'events:', len(b['events']))

st, b = get('/api/calendar/month/?year=2026&month=11', '1001')
print('soldier 1001, Nov         ', st, [(e['type'], e['date_from']) for e in b['events']])

st, b = get('/api/calendar/month/?year=2026&month=13', '1001')
print('month 13                  ', st, b.get('code'))
st, b = get('/api/calendar/month/?type=party', '1001')
print('bad type                  ', st, b.get('code'))
st, b = get('/api/calendar/month/?year=2026&month=12&type=shift', '2001')
print('type=shift (no data yet)  ', st, 'events:', len(b['events']))

st, b = get('/api/calendar/upcoming/', '2001')
print('upcoming for 2001         ', st, len(b['results']), [e['date_from'] for e in b['results']])
"""Manual check of notification read/unread (safe to run more than once)."""
from django.test import Client
from django.test.utils import setup_test_environment
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from notifications.models import Notification
from notifications.services import notify

setup_test_environment()
c = Client()


def auth(mid):
    token = RefreshToken.for_user(User.objects.get(military_id=mid)).access_token
    return {'HTTP_AUTHORIZATION': f'Bearer {token}'}


me = '1001'

# Make sure there is test data: 3 notifications for 1001 and 1 for 2001
for i in range(1, 4):
    notify(User.objects.get(military_id=me), f'إشعار تجريبي رقم {i}')
notify(User.objects.get(military_id='2001'), 'إشعار تجريبي للضابط')

Notification.objects.filter(user__military_id=me).update(is_read=False)   # start from all unread

r = c.get('/api/notifications/', **auth(me)).json()
print('unread at start          ', r['unread_count'])

first_id = r['results'][0]['id']
r = c.patch(f'/api/notifications/{first_id}/read/', **auth(me))
print('mark one                 ', r.status_code, r.json())
r = c.patch(f'/api/notifications/{first_id}/read/', **auth(me))
print('mark same again          ', r.status_code, r.json()['unread_count'])

other_id = Notification.objects.filter(user__military_id='2001').first().pk
r = c.patch(f'/api/notifications/{other_id}/read/', **auth(me))
print("mark someone else's      ", r.status_code, r.json().get('code'))

r = c.get('/api/notifications/?filter=bad', **auth(me))
print('bad filter               ', r.status_code, r.json().get('code'))

r = c.post('/api/notifications/read-all/', **auth(me))
print('mark all                 ', r.status_code, r.json())
print('unread list now          ', len(c.get('/api/notifications/?filter=unread', **auth(me)).json()['results']))
print('read list now            ', len(c.get('/api/notifications/?filter=read', **auth(me)).json()['results']))
print('rows still in database   ', Notification.objects.filter(user__military_id=me).count())
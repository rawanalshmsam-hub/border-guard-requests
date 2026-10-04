"""
Manual end-to-end check of the review flow.
Run ONCE on fresh seed data (running again gives E203 overlaps — that's expected).
"""
import json

from django.test import Client
from django.test.utils import setup_test_environment
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from requests_app.models import ApprovalAction, RequestType

setup_test_environment()
c = Client()


def auth(mid):
    token = RefreshToken.for_user(User.objects.get(military_id=mid)).access_token
    return {'HTTP_AUTHORIZATION': f'Bearer {token}'}


def post_json(url, data, mid):
    return c.post(url, data=json.dumps(data), content_type='application/json', **auth(mid))


def show(label, r):
    body = r.json()
    value = body.get('code') or body.get('status') or body.get('count')
    print(f'{label:<30} {r.status_code} {value}')
    return body


print('--- review list ---')
show('soldier opens review list', c.get('/api/requests/review/', **auth('1002')))
show('north officer, all', c.get('/api/requests/review/', **auth('2001')))
show('north officer, new', c.get('/api/requests/review/?tab=new', **auth('2001')))
show('south officer, all', c.get('/api/requests/review/', **auth('2101')))

print('--- decisions on request 2 ---')
show('reject without reason', post_json('/api/requests/2/reject/', {'reason': ''}, '2001'))
show('soldier tries to approve', post_json('/api/requests/2/approve/', {}, '1002'))
show('officer approves', post_json('/api/requests/2/approve/', {}, '2001'))
show('approve again', post_json('/api/requests/2/approve/', {}, '2001'))

print('--- manning: north site has 8 people, minimum 5 ---')
annual = RequestType.objects.get(name='إجازة اعتيادية')
ids = []
for mid in ['1002', '1003', '1004', '1005']:
    r = c.post('/api/requests/', {'request_type': annual.id, 'reason': 'إجازة',
                                  'date_from': '2026-12-10', 'date_to': '2026-12-12'}, **auth(mid))
    ids.append(show(f'submit leave by {mid}', r)['id'])

for i, req_id in enumerate(ids[:3], start=1):
    show(f'approve leave {i}', post_json(f'/api/requests/{req_id}/approve/', {}, '2001'))

detail = c.get(f'/api/requests/{ids[3]}/', **auth('2001')).json()
print('officer opens 4th: can_decide =', detail['can_decide'], '| manning =', detail['manning'])

body = show('approve 4th WITHOUT ack', post_json(f'/api/requests/{ids[3]}/approve/', {}, '2001'))
print('   affected_dates:', body.get('affected_dates'))
show('approve 4th WITH ack', post_json(f'/api/requests/{ids[3]}/approve/', {'manning_acknowledged': True}, '2001'))
action = ApprovalAction.objects.filter(request_id=ids[3]).last()
print('   recorded manning_acknowledged =', action.manning_acknowledged)
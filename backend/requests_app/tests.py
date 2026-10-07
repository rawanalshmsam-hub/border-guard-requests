"""
Automated tests: minimum manning check + approval workflow.
Run:  python manage.py test
Django builds a fresh test database for every run; db.sqlite3 is never touched.
"""
from datetime import date
from unittest import mock

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from notifications.models import Notification
from org.models import Site, Unit
from requests_app.models import (
    ApprovalAction, ApprovalChainStep, ManningCheckLog, Request, RequestCategory, RequestType,
)
from requests_app.services.manning import manning_check

PASSWORD = 'Test@12345'
S = Request.Status
DEC_10, DEC_11, DEC_12, DEC_14 = date(2026, 12, 10), date(2026, 12, 11), date(2026, 12, 12), date(2026, 12, 14)


class BaseData(TestCase):
    """
    North site: 6 soldiers + 1 officer + 1 finance = 8 people, minimum 5.
    South site: 1 officer + 1 soldier, minimum 4 (used to prove sites are isolated).
    """

    @classmethod
    def setUpTestData(cls):
        cls.north = Site.objects.create(name='North', minimum_manning_threshold=5)
        cls.south = Site.objects.create(name='South', minimum_manning_threshold=4)
        cls.platoon = Unit.objects.create(name='Platoon 1', site=cls.north)
        cls.south_unit = Unit.objects.create(name='Platoon 2', site=cls.south)

        def make_user(mid, role, unit):
            return User.objects.create_user(mid, f'User {mid}', PASSWORD, rank='جندي', unit=unit, role=role)

        cls.soldiers = [make_user(f'10{i}', 'SOLDIER', cls.platoon) for i in range(1, 7)]
        cls.officer = make_user('2001', 'OFFICER', cls.platoon)
        cls.finance = make_user('3001', 'FINANCE', cls.platoon)
        cls.south_officer = make_user('2101', 'OFFICER', cls.south_unit)
        cls.south_soldier = make_user('1101', 'SOLDIER', cls.south_unit)

        category = RequestCategory.objects.create(name='Leaves')
        cls.annual = RequestType.objects.create(
            category=category, name='Annual leave', requires_dates=True, is_leave_type=True)
        ApprovalChainStep.objects.create(request_type=cls.annual, step_order=1, approver_role='OFFICER')

        cls.housing = RequestType.objects.create(
            category=category, name='Housing allowance', requires_attachment=True)
        ApprovalChainStep.objects.create(request_type=cls.housing, step_order=1, approver_role='OFFICER')
        ApprovalChainStep.objects.create(request_type=cls.housing, step_order=2, approver_role='FINANCE')

    _counter = 0

    def make_request(self, user, rtype=None, status=S.APPROVED, date_from=DEC_10, date_to=DEC_12, current_step=1):
        """Create a request directly in the database (bypasses the API) for test setup."""
        BaseData._counter += 1
        return Request.objects.create(
            request_number=f'T-{BaseData._counter}', user=user, request_type=rtype or self.annual,
            reason='test', date_from=date_from, date_to=date_to, status=status, current_step=current_step,
        )

    def api(self, user):
        """API client logged in as `user` (skips the JWT login step)."""
        client = APIClient()
        client.force_authenticate(user=user)
        return client


class ManningCheckTests(BaseData):
    """The key feature: present = active personnel - approved leaves - the pending requester."""

    def test_ok_when_nobody_is_on_leave(self):
        r = manning_check(self.north, DEC_10, DEC_12, requester=self.soldiers[0])
        self.assertEqual(r.result, 'OK')
        self.assertEqual(r.total_personnel, 8)
        self.assertEqual(r.affected_dates, [])

    def test_exactly_the_minimum_is_ok(self):
        # 2 approved + the requester = 3 absent -> 5 present = minimum -> OK (rule is "below", not "equal")
        self.make_request(self.soldiers[0])
        self.make_request(self.soldiers[1])
        r = manning_check(self.north, DEC_10, DEC_12, requester=self.soldiers[2])
        self.assertEqual(r.result, 'OK')

    def test_below_minimum_reports_only_the_overlapping_days(self):
        for s in self.soldiers[:3]:                       # 3 approved leaves on Dec 10-12
            self.make_request(s)
        r = manning_check(self.north, DEC_11, DEC_14, requester=self.soldiers[3])
        self.assertEqual(r.result, 'BELOW_MINIMUM')
        self.assertEqual(r.affected_dates, ['2026-12-11', '2026-12-12'])   # 13-14 are fine

    def test_pending_cancelled_and_other_site_leaves_are_ignored(self):
        self.make_request(self.soldiers[0], status=S.PENDING)
        self.make_request(self.soldiers[1], status=S.PENDING)
        self.make_request(self.soldiers[2], status=S.CANCELLED)
        self.make_request(self.south_soldier)                # approved, but at the South site
        r = manning_check(self.north, DEC_10, DEC_12, requester=self.soldiers[3])
        self.assertEqual(r.result, 'OK')

    def test_same_person_is_counted_once_per_day(self):
        # soldier 0 has two overlapping approved leaves; must count as ONE absence on Dec 11
        self.make_request(self.soldiers[0], date_from=DEC_10, date_to=DEC_11)
        self.make_request(self.soldiers[0], date_from=DEC_11, date_to=DEC_12)
        self.make_request(self.soldiers[1])
        r = manning_check(self.north, DEC_10, DEC_12, requester=self.soldiers[2])
        self.assertEqual(r.result, 'OK')                     # 8 - 3 people = 5 present

    def test_every_check_is_logged(self):
        before = ManningCheckLog.objects.count()
        manning_check(self.north, DEC_10, DEC_12, requester=self.soldiers[0])
        manning_check(self.north, DEC_10, DEC_12, requester=self.soldiers[1])
        self.assertEqual(ManningCheckLog.objects.count(), before + 2)

    def test_fail_safe_on_unexpected_error(self):
        with mock.patch('requests_app.services.manning._calculate', side_effect=RuntimeError('db down')):
            with self.assertLogs('requests_app.services.manning', level='ERROR'):
                r = manning_check(self.north, DEC_10, DEC_12, requester=self.soldiers[0])
        self.assertEqual(r.result, 'BELOW_MINIMUM')          # never a silent "OK"
        self.assertEqual(r.error_code, 'E301')
        self.assertTrue(ManningCheckLog.objects.filter(result='BELOW_MINIMUM').exists())

    def test_missing_site_fails_safe(self):
        r = manning_check(None, DEC_10, DEC_12, requester=self.soldiers[0])
        self.assertEqual(r.result, 'BELOW_MINIMUM')
        self.assertEqual(r.error_code, 'E302')


class ApprovalFlowTests(BaseData):

    def leave_payload(self, date_from='2026-12-10', date_to='2026-12-12'):
        return {'request_type': self.annual.id, 'reason': 'إجازة', 'date_from': date_from, 'date_to': date_to}

    def test_submit_leave_creates_pending_request_and_notifications(self):
        res = self.api(self.soldiers[0]).post('/api/requests/', self.leave_payload(), format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['status'], 'PENDING')
        self.assertTrue(res.data['request_number'].startswith('REQ-'))
        self.assertEqual(Notification.objects.filter(user=self.officer).count(), 1)      # approver told
        self.assertEqual(Notification.objects.filter(user=self.soldiers[0]).count(), 1)  # requester told
        self.assertTrue(ManningCheckLog.objects.filter(request_id=res.data['id']).exists())

    def test_overlapping_request_is_rejected_E203(self):
        self.make_request(self.soldiers[0], status=S.PENDING)
        res = self.api(self.soldiers[0]).post('/api/requests/', self.leave_payload('2026-12-12', '2026-12-14'), format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], 'E203')

    def test_end_before_start_is_rejected_E201(self):
        res = self.api(self.soldiers[0]).post('/api/requests/', self.leave_payload('2026-12-12', '2026-12-10'), format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], 'E201')
        self.assertEqual(res.data['field'], 'date_to')

    def test_reject_and_return_require_a_reason_E403(self):
        req = self.make_request(self.soldiers[0], status=S.PENDING)
        officer = self.api(self.officer)
        self.assertEqual(officer.post(f'/api/requests/{req.id}/reject/', {}, format='json').data['code'], 'E403')
        self.assertEqual(officer.post(f'/api/requests/{req.id}/return/', {'reason': '  '}, format='json').data['code'], 'E403')
        req.refresh_from_db()
        self.assertEqual(req.status, S.PENDING)

    def test_only_the_current_approver_can_decide_E401(self):
        req = self.make_request(self.soldiers[0], status=S.PENDING)
        for user in (self.soldiers[1], self.south_officer, self.finance):
            res = self.api(user).post(f'/api/requests/{req.id}/approve/', {}, format='json')
            self.assertEqual(res.status_code, 403, user.military_id)
            self.assertEqual(res.data['code'], 'E401')

    def test_manning_warning_requires_acknowledgement_E405(self):
        for s in self.soldiers[:3]:
            self.make_request(s)                               # 3 approved leaves
        req = self.make_request(self.soldiers[3], status=S.PENDING)
        officer = self.api(self.officer)

        res = officer.post(f'/api/requests/{req.id}/approve/', {}, format='json')
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.data['code'], 'E405')
        self.assertEqual(res.data['affected_dates'], ['2026-12-10', '2026-12-11', '2026-12-12'])
        req.refresh_from_db()
        self.assertEqual(req.status, S.PENDING)                # nothing approved
        self.assertTrue(ManningCheckLog.objects.filter(request=req, result='BELOW_MINIMUM').exists())  # but logged

        res = officer.post(f'/api/requests/{req.id}/approve/', {'manning_acknowledged': True}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        req.refresh_from_db()
        self.assertEqual(req.status, S.APPROVED)
        self.assertTrue(ApprovalAction.objects.get(request=req).manning_acknowledged)

    def test_two_step_chain_officer_then_finance(self):
        req = self.make_request(self.soldiers[0], rtype=self.housing, status=S.PENDING, date_from=None, date_to=None)

        self.assertEqual(self.api(self.officer).post(f'/api/requests/{req.id}/approve/', {}, format='json').status_code, 200)
        req.refresh_from_db()
        self.assertEqual((req.status, req.current_step), (S.PENDING, 2))       # moved to finance
        self.assertEqual(Notification.objects.filter(user=self.finance).count(), 1)

        self.assertEqual(self.api(self.officer).post(f'/api/requests/{req.id}/approve/', {}, format='json').status_code, 403)
        self.assertEqual(self.api(self.finance).post(f'/api/requests/{req.id}/approve/', {}, format='json').status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.status, S.APPROVED)

    def test_return_then_edit_goes_back_to_the_same_step(self):
        req = self.make_request(self.soldiers[0], status=S.PENDING)
        self.api(self.officer).post(f'/api/requests/{req.id}/return/', {'reason': 'غيّر التاريخ'}, format='json')
        req.refresh_from_db()
        self.assertEqual(req.status, S.PENDING_EDIT)

        res = self.api(self.soldiers[0]).put(f'/api/requests/{req.id}/', self.leave_payload('2026-12-15', '2026-12-16'), format='json')
        self.assertEqual(res.status_code, 200, res.data)
        req.refresh_from_db()
        self.assertEqual((req.status, req.current_step, req.date_from), (S.PENDING, 1, date(2026, 12, 15)))

    def test_cancel_is_soft_and_owner_only(self):
        req = self.make_request(self.soldiers[0], status=S.PENDING)
        body = {'status': 'CANCELLED', 'reason': 'test'}
        self.assertEqual(self.api(self.soldiers[1]).patch(f'/api/requests/{req.id}/', body, format='json').status_code, 404)
        self.assertEqual(self.api(self.soldiers[0]).patch(f'/api/requests/{req.id}/', body, format='json').status_code, 200)
        self.assertTrue(Request.objects.filter(pk=req.pk, status=S.CANCELLED).exists())   # row kept
        self.assertEqual(self.api(self.soldiers[0]).patch(f'/api/requests/{req.id}/', body, format='json').data['code'], 'E202')

    def test_soldier_cannot_open_someone_elses_request(self):
        req = self.make_request(self.soldiers[0], status=S.PENDING)
        self.assertEqual(self.api(self.soldiers[1]).get(f'/api/requests/{req.id}/').status_code, 404)
        self.assertEqual(self.api(self.officer).get(f'/api/requests/{req.id}/').status_code, 200)
        self.assertEqual(self.api(self.south_officer).get(f'/api/requests/{req.id}/').status_code, 404)
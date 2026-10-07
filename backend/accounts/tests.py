"""Login security tests."""
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from org.models import Site, Unit

PASSWORD = 'Test@12345'
LOGIN = '/api/auth/login/'


class LoginTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        site = Site.objects.create(name='North', minimum_manning_threshold=5)
        unit = Unit.objects.create(name='Platoon 1', site=site)
        cls.user = User.objects.create_user('1001', 'Test Soldier', PASSWORD, unit=unit)
        cls.suspended = User.objects.create_user('1002', 'Suspended', PASSWORD, unit=unit,
                                                 status=User.Status.SUSPENDED)

    def login(self, military_id, password):
        return APIClient().post(LOGIN, {'military_id': military_id, 'password': password}, format='json')

    def test_login_success_returns_tokens_and_profile(self):
        res = self.login('1001', PASSWORD)
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertEqual(res.data['user']['military_id'], '1001')

    def test_wrong_password_and_unknown_id_give_the_same_error(self):
        wrong = self.login('1001', 'wrong')
        unknown = self.login('9999', 'wrong')
        self.assertEqual((wrong.status_code, wrong.data['code']), (401, 'E102'))
        self.assertEqual(wrong.data, unknown.data)          # no hint that 1001 exists

    def test_account_locks_after_five_failures_E103(self):
        for _ in range(5):
            self.login('1001', 'wrong')
        res = self.login('1001', PASSWORD)                  # correct password, still refused
        self.assertEqual((res.status_code, res.data['code']), (403, 'E103'))

    def test_suspended_user_cannot_log_in_E104(self):
        res = self.login('1002', PASSWORD)
        self.assertEqual((res.status_code, res.data['code']), (403, 'E104'))

    def test_protected_api_requires_a_token(self):
        self.assertEqual(APIClient().get('/api/auth/me/').status_code, 401)
        
    def test_change_password_rejects_wrong_current_password(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        res = client.post('/api/auth/change-password/',
                          {'current_password': 'wrong', 'new_password': 'NewStrong#2026'}, format='json')
        self.assertEqual((res.status_code, res.data['code'], res.data['field']), (400, 'E102', 'current_password'))

    def test_change_password_then_login_with_new_one(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        res = client.post('/api/auth/change-password/',
                          {'current_password': PASSWORD, 'new_password': 'NewStrong#2026'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.login('1001', PASSWORD).status_code, 401)          # old one no longer works
        self.assertEqual(self.login('1001', 'NewStrong#2026').status_code, 200)
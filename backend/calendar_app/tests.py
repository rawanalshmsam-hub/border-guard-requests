"""Calendar scope + privacy tests (option b)."""
from requests_app.tests import BaseData

MONTH = '/api/calendar/month/?year=2026&month=12'


class CalendarTests(BaseData):

    def setUp(self):
        self.mine = self.make_request(self.soldiers[0])          # approved leave Dec 10-12
        self.make_request(self.soldiers[1])                      # another approved leave

    def test_officer_sees_site_leaves_without_private_details(self):
        data = self.api(self.officer).get(MONTH).data
        self.assertEqual(len(data['events']), 2)
        for event in data['events']:
            self.assertFalse(event['is_mine'])
            self.assertNotIn('request_id', event)                # no request details
            self.assertNotIn('reason', event)
            self.assertEqual(set(event['person']), {'full_name', 'rank'})
        self.assertEqual(data['manning']['days']['2026-12-11']['on_leave'], 2)

    def test_soldier_sees_only_own_events(self):
        data = self.api(self.soldiers[0]).get(MONTH).data
        self.assertEqual(len(data['events']), 1)
        self.assertEqual(data['events'][0]['request_id'], self.mine.id)
        self.assertIsNone(data['manning'])                       # no site numbers for soldiers

    def test_officer_of_another_site_sees_nothing(self):
        data = self.api(self.south_officer).get(MONTH).data
        self.assertEqual(data['events'], [])
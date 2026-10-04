from rest_framework.response import Response
from rest_framework.views import APIView

from requests_app.views import int_param

from .services import month_view, upcoming_events


class MonthView(APIView):
    """Calendar 4.1 month grid, 4.2 type filter, 4.3 navigation / Home 4.6
    ?year=2026&month=12&type=all|leave|return|shift|course|mission|medical"""

    def get(self, request):
        q = request.query_params
        return Response(month_view(request.user, q.get('year'), q.get('month'), q.get('type')))


class UpcomingView(APIView):
    """Calendar 4.4 / Home 4.7 — ?type=&limit=1..20"""

    def get(self, request):
        limit = int_param(request, 'limit', default=5, maximum=20)
        return Response({'results': upcoming_events(request.user, request.query_params.get('type'), limit)})
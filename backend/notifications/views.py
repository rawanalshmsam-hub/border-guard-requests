from rest_framework.response import Response
from rest_framework.views import APIView

from requests_app.views import int_param

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """
    Home 4.5 (preview: ?limit=3) and Notifications page list.
    ?filter=all|unread|read   ?limit=1..50
    """

    def get(self, request):
        mine = Notification.objects.filter(user=request.user)
        qs = mine.select_related('related_request')
        flt = request.query_params.get('filter', 'all')
        if flt == 'unread':
            qs = qs.filter(is_read=False)
        elif flt == 'read':
            qs = qs.filter(is_read=True)
        limit = int_param(request, 'limit', default=20, maximum=50)
        return Response({
            'unread_count': mine.filter(is_read=False).count(),   # red dot on the bell icon
            'results': NotificationSerializer(qs[:limit], many=True).data,
        })
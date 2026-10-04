from rest_framework.response import Response
from rest_framework.views import APIView

from config.errors import ServiceError
from requests_app.views import int_param

from .models import Notification
from .serializers import NotificationSerializer

FILTERS = ('all', 'unread', 'read')


def unread_count(user):
    return Notification.objects.filter(user=user, is_read=False).count()


class NotificationListView(APIView):
    """
    Notifications 4.1 / Home 4.5 (preview: ?limit=3)
    ?filter=all|unread|read   ?limit=1..50
    """

    def get(self, request):
        flt = request.query_params.get('filter', 'all')
        if flt not in FILTERS:
            raise ServiceError('E201', 'قيمة الفلتر غير صحيحة', field='filter')

        qs = Notification.objects.filter(user=request.user).select_related('related_request')
        if flt == 'unread':
            qs = qs.filter(is_read=False)
        elif flt == 'read':
            qs = qs.filter(is_read=True)

        limit = int_param(request, 'limit', default=20, maximum=50)
        return Response({
            'unread_count': unread_count(request.user),   # red dot on the bell icon
            'results': NotificationSerializer(qs[:limit], many=True).data,
        })


class MarkReadView(APIView):
    """Notifications 2.2 — the '✕' button: mark one as read (never deleted)."""

    def patch(self, request, pk):
        notif = Notification.objects.filter(pk=pk, user=request.user).first()
        if notif is None:
            raise ServiceError('E202', 'الإشعار غير موجود', status=404)
        if not notif.is_read:
            notif.is_read = True
            notif.save(update_fields=['is_read'])
        return Response({'id': notif.pk, 'is_read': True, 'unread_count': unread_count(request.user)})


class MarkAllReadView(APIView):
    """Notifications 2.1 — mark all of my notifications as read."""

    def post(self, request):
        marked = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'marked': marked, 'unread_count': 0})
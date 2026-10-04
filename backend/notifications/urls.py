from django.urls import path

from .views import MarkAllReadView, MarkReadView, NotificationListView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications'),                 # 4.1 / Home 4.5
    path('<int:pk>/read/', MarkReadView.as_view(), name='notification-read'),        # 2.2
    path('read-all/', MarkAllReadView.as_view(), name='notifications-read-all'),     # 2.1
]
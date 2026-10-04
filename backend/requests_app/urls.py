from django.urls import path

from .views import (
    AttachmentUploadView, RecentRequestsView, RequestCreateView,
    RequestsSummaryView, RequestTypesView,
)

urlpatterns = [
    path('', RequestCreateView.as_view(), name='request-create'),                              # New request 1.1
    path('<int:pk>/attachments/', AttachmentUploadView.as_view(), name='request-attachments'),  # New request 1.2
    path('types/', RequestTypesView.as_view(), name='request-types'),                          # New request 4.1 / Home 4.3
    path('summary/', RequestsSummaryView.as_view(), name='requests-summary'),                   # Home 4.2
    path('recent/', RecentRequestsView.as_view(), name='requests-recent'),                      # Home 4.4
]
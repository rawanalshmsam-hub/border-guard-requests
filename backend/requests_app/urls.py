from django.urls import path

from .views import (
    ArchiveView, AttachmentDownloadView, AttachmentUploadView, MyRequestsView,
    RecentRequestsView, RequestCreateView, RequestDetailView, RequestsSummaryView,
    RequestTypesView,
)

urlpatterns = [
    path('', RequestCreateView.as_view(), name='request-create'),                               # New request 1.1
    path('types/', RequestTypesView.as_view(), name='request-types'),                           # New request 4.1 / Home 4.3
    path('summary/', RequestsSummaryView.as_view(), name='requests-summary'),                   # Home 4.2
    path('recent/', RecentRequestsView.as_view(), name='requests-recent'),                      # Home 4.4
    path('mine/', MyRequestsView.as_view(), name='requests-mine'),                              # My requests 4.1
    path('archive/', ArchiveView.as_view(), name='requests-archive'),                           # My requests 4.2
    path('<int:pk>/', RequestDetailView.as_view(), name='request-detail'),                      # My requests 4.3 / Details 4.1
    path('<int:pk>/attachments/', AttachmentUploadView.as_view(), name='request-attachments'),  # New request 1.2
    path('attachments/<int:pk>/download/', AttachmentDownloadView.as_view(),
         name='attachment-download'),                                                          # My requests 4.4 / Details 4.2
]
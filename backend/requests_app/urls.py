from django.urls import path

from .models import ApprovalAction
from .views import (
    ArchiveView, AttachmentDownloadView, AttachmentUploadView, DecisionView, MyRequestsView,
    RecentRequestsView, RequestCreateView, RequestDetailView, RequestsSummaryView,
    RequestTypesView, ReviewListView,
)

D = ApprovalAction.Decision

urlpatterns = [
    path('', RequestCreateView.as_view(), name='request-create'),                               # New request 1.1
    path('types/', RequestTypesView.as_view(), name='request-types'),                           # New request 4.1 / Home 4.3
    path('summary/', RequestsSummaryView.as_view(), name='requests-summary'),                   # Home 4.2
    path('recent/', RecentRequestsView.as_view(), name='requests-recent'),                      # Home 4.4
    path('mine/', MyRequestsView.as_view(), name='requests-mine'),                              # My requests 4.1
    path('archive/', ArchiveView.as_view(), name='requests-archive'),                           # My requests 4.2
    path('review/', ReviewListView.as_view(), name='review-list'),                              # Review 4.1
    path('<int:pk>/', RequestDetailView.as_view(), name='request-detail'),                      # Details 4.1 / Review 4.2
    path('<int:pk>/approve/', DecisionView.as_view(decision=D.APPROVE), name='request-approve'),  # Review 2.1
    path('<int:pk>/reject/', DecisionView.as_view(decision=D.REJECT), name='request-reject'),     # Review 2.2
    path('<int:pk>/return/', DecisionView.as_view(decision=D.RETURN), name='request-return'),     # Review 2.3
    path('<int:pk>/attachments/', AttachmentUploadView.as_view(), name='request-attachments'),  # New request 1.2
    path('attachments/<int:pk>/download/', AttachmentDownloadView.as_view(),
         name='attachment-download'),                                                          # Details 4.2
]
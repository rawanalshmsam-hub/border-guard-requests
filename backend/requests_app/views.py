from django.db.models import Prefetch, Q
from django.http import FileResponse
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.services import log_action
from config.errors import ServiceError
from config.pagination import StandardPagination

from .models import ApprovalAction, Attachment, Request, RequestCategory, RequestType
from .serializers import (
    RecentRequestSerializer, RequestCategorySerializer, RequestDetailSerializer,
    RequestListSerializer, RequestSerializer, ReviewListSerializer,
)
from .services.access import get_request_for_user
from .services.attachments import add_attachments
from .services.changes import cancel_request, edit_request
from .services.dashboard import ARCHIVE_STATUSES, STATUS_GROUPS, recent_requests, requests_summary
from .services.manning import manning_check
from .services.review import decide_request, manning_payload, review_queryset
from .services.submit import submit_request
from .services.workflow import is_current_approver


def int_param(request, name, default, minimum=1, maximum=50):
    """Read ?name= as an int, clamped to [minimum, maximum]."""
    try:
        value = int(request.query_params.get(name, default))
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(value, maximum))


def truthy(value):
    return value in (True, 1, '1', 'true', 'True', 'on')


def detail_response(request, pk):
    """
    Full request details. For the current approver it also returns can_decide=True
    and a LIVE manning check (leave types), so the dialog can show the warning first.
    """
    req = get_request_for_user(request.user, pk)
    data = RequestDetailSerializer(req, context={'request': request}).data
    data['can_decide'] = is_current_approver(request.user, req)
    data['manning'] = None
    if data['can_decide'] and req.request_type.is_leave_type and req.date_from:
        site = req.user.unit.site if req.user.unit else None
        res = manning_check(site, req.date_from, req.date_to,
                            requester=req.user, request=req, checked_by=request.user)
        data['manning'] = manning_payload(res)
    return Response(data)


# ---------- New request ----------

class RequestTypesView(APIView):
    """New request 4.1 / Home 4.3 — categories with their types + priority options."""

    def get(self, request):
        usable_types = RequestType.objects.filter(chain_steps__isnull=False).distinct().order_by('id')
        categories = RequestCategory.objects.order_by('id').prefetch_related(
            Prefetch('types', queryset=usable_types))
        return Response({
            'categories': RequestCategorySerializer(categories, many=True).data,
            'priorities': [{'value': v, 'label': l} for v, l in Request.Priority.choices],
        })


class RequestCreateView(APIView):
    """New request 1.1 — submit (multipart: fields + 'files')."""

    def post(self, request):
        req, _manning = submit_request(request.user, request.data, request.FILES.getlist('files'))
        return Response(RequestSerializer(req).data, status=201)


class AttachmentUploadView(APIView):
    """New request 1.2 — add attachments to an existing request."""

    def post(self, request, pk):
        req = add_attachments(request.user, pk, request.FILES.getlist('files'))
        return Response(RequestSerializer(req).data, status=201)


# ---------- Home ----------

class RequestsSummaryView(APIView):
    """Home 4.2 — stat cards."""

    def get(self, request):
        return Response(requests_summary(request.user))


class RecentRequestsView(APIView):
    """Home 4.4 — recent requests with approval path. ?limit=1..10"""

    def get(self, request):
        limit = int_param(request, 'limit', default=1, maximum=10)
        return Response(RecentRequestSerializer(recent_requests(request.user, limit), many=True).data)


# ---------- My requests / archive ----------

class MyRequestsView(generics.ListAPIView):
    """My requests 4.1 — ?status=all|under_review|approved|rejected|cancelled &q= &page="""
    serializer_class = RequestListSerializer
    pagination_class = StandardPagination
    base_statuses = None

    def get_queryset(self):
        qs = (Request.objects.filter(user=self.request.user)
              .select_related('request_type__category')
              .prefetch_related('request_type__chain_steps')
              .order_by('-created_at'))
        if self.base_statuses is not None:
            qs = qs.filter(status__in=self.base_statuses)

        status = self.request.query_params.get('status', 'all')
        if status != 'all':
            if status not in STATUS_GROUPS:
                raise ServiceError('E201', 'قيمة فلتر الحالة غير صحيحة', field='status')
            qs = qs.filter(status__in=STATUS_GROUPS[status])

        q = self.request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(Q(request_number__icontains=q) | Q(request_type__name__icontains=q))
        return qs


class ArchiveView(MyRequestsView):
    """My requests 4.2 — closed requests only (same table, filtered by status)."""
    base_statuses = ARCHIVE_STATUSES


# ---------- Details, edit, cancel, files ----------

class RequestDetailView(APIView):
    """
    GET   — My requests 4.3 / Request details 4.1 / Review 4.2
    PUT   — Request details 2.1 (edit after return)
    PATCH — Request details 3.1 (cancel: {"status": "CANCELLED", "reason": "..."})
    """

    def get(self, request, pk):
        return detail_response(request, pk)

    def put(self, request, pk):
        edit_request(request.user, pk, request.data)
        return detail_response(request, pk)

    def patch(self, request, pk):
        if request.data.get('status') != Request.Status.CANCELLED:
            raise ServiceError('E201', 'التعديل الجزئي يدعم الإلغاء فقط', field='status')
        cancel_request(request.user, pk, str(request.data.get('reason', '')).strip())
        return detail_response(request, pk)


class AttachmentDownloadView(APIView):
    """My requests 4.4 / Request details 4.2 — ?inline=1 to preview in the browser."""

    def get(self, request, pk):
        att = Attachment.objects.filter(pk=pk).first()
        if att is None:
            raise ServiceError('E202', 'المرفق غير موجود', status=404)
        get_request_for_user(request.user, att.request_id)

        try:
            file = att.file.open('rb')
        except FileNotFoundError:
            raise ServiceError('E204', 'الملف غير متوفر على الخادم', status=404)

        log_action(request.user, 'DOWNLOAD_ATTACHMENT', att, request_id=att.request_id)
        inline = request.query_params.get('inline') == '1'
        return FileResponse(file, as_attachment=not inline, filename=att.file_name)


# ---------- Review (leaders) ----------

class ReviewListView(generics.ListAPIView):
    """Review 4.1 — ?tab=all|new|under_review|awaiting &page="""
    serializer_class = ReviewListSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return review_queryset(self.request.user, self.request.query_params.get('tab', 'all'))


class DecisionView(APIView):
    """Review 2.1 approve / 2.2 reject / 2.3 return — body: {reason, manning_acknowledged}"""
    decision = None

    def post(self, request, pk):
        decide_request(request.user, pk, self.decision,
                       reason=str(request.data.get('reason', '')),
                       acknowledged=truthy(request.data.get('manning_acknowledged')))
        return detail_response(request, pk)
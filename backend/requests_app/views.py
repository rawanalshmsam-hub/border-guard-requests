from django.db.models import Prefetch
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Request, RequestCategory, RequestType
from .serializers import RequestCategorySerializer
from django.db.models import Prefetch
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Request, RequestCategory, RequestType
from .serializers import RecentRequestSerializer, RequestCategorySerializer, RequestSerializer
from .services.dashboard import recent_requests, requests_summary
from .services.attachments import add_attachments
from .services.submit import submit_request


class RequestTypesView(APIView):
    """API 4.1 (New request): categories with their types + priority options."""

    def get(self, request):
        # Only types that have an approval chain can be submitted
        usable_types = RequestType.objects.filter(chain_steps__isnull=False).distinct().order_by('id')
        categories = RequestCategory.objects.order_by('id').prefetch_related(
            Prefetch('types', queryset=usable_types)
        )
        return Response({
            'categories': RequestCategorySerializer(categories, many=True).data,
            'priorities': [{'value': v, 'label': l} for v, l in Request.Priority.choices],
        })

    

class RequestCreateView(APIView):
    """API 1.1 — submit a new request (multipart: fields + 'files')."""

    def post(self, request):
        files = request.FILES.getlist('files')
        req, _manning = submit_request(request.user, request.data, files)
        return Response(RequestSerializer(req).data, status=201)


class AttachmentUploadView(APIView):
    """API 1.2 — add attachments to an existing request."""

    def post(self, request, pk):
        req = add_attachments(request.user, pk, request.FILES.getlist('files'))
        return Response(RequestSerializer(req).data, status=201)


def int_param(request, name, default, minimum=1, maximum=50):
    """Read ?name= as an int, clamped to [minimum, maximum]."""
    try:
        value = int(request.query_params.get(name, default))
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(value, maximum))


class RequestsSummaryView(APIView):
    """Home 4.2 — stat cards."""

    def get(self, request):
        return Response(requests_summary(request.user))


class RecentRequestsView(APIView):
    """Home 4.4 — recent requests with approval path. ?limit=1..10"""

    def get(self, request):
        limit = int_param(request, 'limit', default=1, maximum=10)
        qs = recent_requests(request.user, limit)
        return Response(RecentRequestSerializer(qs, many=True).data)
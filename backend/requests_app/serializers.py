from rest_framework import serializers

from .models import RequestCategory, RequestType
from .models import Attachment, Request, RequestCategory, RequestType


class RequestTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequestType
        fields = ['id', 'name', 'requires_dates', 'requires_attachment', 'is_leave_type']


class RequestCategorySerializer(serializers.ModelSerializer):
    types = RequestTypeSerializer(many=True, read_only=True)
    types_count = serializers.SerializerMethodField()

    class Meta:
        model = RequestCategory
        fields = ['id', 'name', 'icon', 'types_count', 'types']

    def get_types_count(self, obj):
        return len(obj.types.all())  # uses the prefetched list, no extra query

    

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['id', 'file_name', 'file_size', 'uploaded_at']


class RequestSerializer(serializers.ModelSerializer):
    request_type_name = serializers.CharField(source='request_type.name', read_only=True)
    category_name = serializers.CharField(source='request_type.category.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Request
        fields = ['id', 'request_number', 'request_type', 'request_type_name', 'category_name',
                  'reason', 'date_from', 'date_to', 'priority', 'priority_display',
                  'status', 'status_display', 'manning_warning', 'current_step',
                  'created_at', 'updated_at', 'attachments']


class RecentRequestSerializer(serializers.ModelSerializer):
    """Home 4.4 — card with status badge, dates and approval path."""
    request_type_name = serializers.CharField(source='request_type.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approval_path = serializers.SerializerMethodField()

    class Meta:
        model = Request
        fields = ['id', 'request_number', 'request_type_name', 'status', 'status_display',
                  'date_from', 'date_to', 'created_at', 'approval_path']

    def get_approval_path(self, obj):
        from .services.dashboard import approval_path
        return approval_path(obj)
from rest_framework import serializers

from .models import ApprovalAction, Attachment, Request, RequestCategory, RequestType


# ---------- Request types (New request 4.1 / Home 4.3) ----------

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


# ---------- Request (create response) ----------

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


# ---------- Lists (Home 4.4, My requests 4.1 / 4.2) ----------

class RecentRequestSerializer(serializers.ModelSerializer):
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


class RequestListSerializer(RecentRequestSerializer):
    category_name = serializers.CharField(source='request_type.category.name', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta(RecentRequestSerializer.Meta):
        fields = RecentRequestSerializer.Meta.fields + ['category_name', 'priority', 'priority_display']


# ---------- Details (My requests 4.3 / Request details 4.1) ----------

class ApprovalActionSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source='approver.full_name', read_only=True)
    approver_rank = serializers.CharField(source='approver.rank', read_only=True)
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)

    class Meta:
        model = ApprovalAction
        fields = ['id', 'decision', 'decision_display', 'reason', 'manning_acknowledged',
                  'action_date', 'approver_name', 'approver_rank']


class RequestDetailSerializer(RequestSerializer):
    requester = serializers.SerializerMethodField()
    approval_path = serializers.SerializerMethodField()
    actions = ApprovalActionSerializer(many=True, read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    class Meta(RequestSerializer.Meta):
        fields = RequestSerializer.Meta.fields + [
            'requester', 'approval_path', 'actions', 'can_edit', 'can_cancel']

    def _is_owner(self, obj):
        return obj.user_id == self.context['request'].user.pk

    def get_requester(self, obj):
        u = obj.user
        return {
            'military_id': u.military_id,
            'full_name': u.full_name,
            'rank': u.rank,
            'unit_name': u.unit.name if u.unit else None,
            'site_name': u.unit.site.name if u.unit else None,
        }

    def get_approval_path(self, obj):
        from .services.dashboard import approval_path
        return approval_path(obj)

    def get_can_edit(self, obj):
        # editing is allowed only after an approver returned it (PENDING_EDIT)
        return self._is_owner(obj) and obj.status == Request.Status.PENDING_EDIT

    def get_can_cancel(self, obj):
        return self._is_owner(obj) and obj.status in (Request.Status.PENDING, Request.Status.PENDING_EDIT)
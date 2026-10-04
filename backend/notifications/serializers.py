from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    related_request_number = serializers.CharField(
        source='related_request.request_number', read_only=True, default=None)

    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at', 'related_request', 'related_request_number']
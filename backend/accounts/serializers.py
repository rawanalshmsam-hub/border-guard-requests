from rest_framework import serializers

from .models import User


class UserProfileSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    unit_name = serializers.SerializerMethodField()
    site_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'military_id', 'full_name', 'rank', 'role', 'role_display',
                  'unit_name', 'site_name', 'phone', 'email']

    def get_unit_name(self, obj):
        return obj.unit.name if obj.unit else None

    def get_site_name(self, obj):
        return obj.unit.site.name if obj.unit else None
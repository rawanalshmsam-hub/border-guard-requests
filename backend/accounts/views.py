from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.db.models import F
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from config.errors import api_error

from .models import User
from .serializers import UserProfileSerializer
from .services import log_action


class LoginView(APIView):
    """POST {military_id, password} -> {access, refresh, user}"""
    permission_classes = [AllowAny]
    authentication_classes = []  # login must work without a token

    def post(self, request):
        military_id = str(request.data.get('military_id', '')).strip()
        password = request.data.get('password', '')
        ip = request.META.get('REMOTE_ADDR')
        max_attempts = settings.MAX_FAILED_LOGIN_ATTEMPTS

        if not military_id or not password:
            return api_error('E101', 'الرقم العسكري وكلمة المرور مطلوبة', 400)

        user = User.objects.filter(military_id=military_id).first()

        # 1) Locked account: refuse even if the password is correct
        if user and user.failed_attempts >= max_attempts:
            log_action(user, 'LOGIN_BLOCKED', ip=ip)
            return api_error('E103', 'تم قفل الحساب بسبب تكرار المحاولات الخاطئة، راجع مدير النظام', 403)

        # 2) Wrong military ID or password: same message for both
        if user is None or not user.check_password(password):
            if user:
                User.objects.filter(pk=user.pk).update(failed_attempts=F('failed_attempts') + 1)
            log_action(user, 'LOGIN_FAILED', military_id=military_id, ip=ip)
            return api_error('E102', 'الرقم العسكري أو كلمة المرور غير صحيحة', 401)

        # 3) Suspended / transferred user
        if not user.is_active:
            log_action(user, 'LOGIN_INACTIVE', ip=ip)
            return api_error('E104', 'الحساب غير نشط', 403)

        # 4) Success: reset counter, issue tokens
        User.objects.filter(pk=user.pk).update(failed_attempts=0)
        update_last_login(None, user)
        log_action(user, 'LOGIN', ip=ip)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(user).data,
        })


class MeView(APIView):
    """GET current user's profile (Home 4.1). Requires a valid access token."""

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)
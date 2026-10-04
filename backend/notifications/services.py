from .models import Notification


def notify(user, message, request=None):
    """Create one in-app notification. Inactive/missing recipients are skipped (E501 case)."""
    if user is None or not user.is_active:
        return None
    return Notification.objects.create(user=user, message=message, related_request=request)


def notify_many(users, message, request=None):
    for user in users:
        notify(user, message, request)
from .models import AuditLog


def log_action(user, action, obj=None, **details):
    """Write one append-only audit entry. Used by every app."""
    return AuditLog.objects.create(
        user=user if (user is not None and user.pk) else None,
        action=action,
        object_type=obj.__class__.__name__ if obj is not None else '',
        object_id=str(obj.pk) if obj is not None else '',
        details=details,
    )
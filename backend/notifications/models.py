from django.conf import settings
from django.db import models


class Notification(models.Model):
    """ERD: NOTIFICATIONS. The '✕' in the UI sets is_read=True; rows are never deleted."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notifications', verbose_name='المستلم',
    )
    related_request = models.ForeignKey(
        'requests_app.Request', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='notifications', verbose_name='الطلب المرتبط',
    )
    message = models.CharField('الرسالة', max_length=500)
    is_read = models.BooleanField('مقروء', default=False)
    created_at = models.DateTimeField('التاريخ', auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'is_read'], name='idx_notif_user_read')]
        verbose_name = 'إشعار'
        verbose_name_plural = 'الإشعارات'

    def __str__(self):
        return self.message[:50]
from django.conf import settings
from django.db import models


class DutyRoster(models.Model):
    """ERD: DUTY_ROSTER — feeds the calendar (next return date)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='duty_rosters', verbose_name='المستخدم',
    )
    next_return_date = models.DateField('تاريخ العودة القادم', null=True, blank=True)
    notes = models.CharField('ملاحظات', max_length=500, blank=True)

    class Meta:
        db_table = 'duty_roster'
        verbose_name = 'جدول دوام'
        verbose_name_plural = 'جداول الدوام'

    def __str__(self):
        return f'{self.user} — {self.next_return_date}'
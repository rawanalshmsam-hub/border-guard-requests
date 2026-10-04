from django.conf import settings
from django.db import models
from django.db.models import F, Q


class RequestCategory(models.Model):
    """ERD: REQUEST_CATEGORIES — leaves, administrative, financial..."""
    name = models.CharField('الاسم', max_length=100)
    icon = models.CharField('الأيقونة', max_length=50, blank=True)

    class Meta:
        db_table = 'request_categories'
        verbose_name = 'تصنيف طلب'
        verbose_name_plural = 'تصنيفات الطلبات'

    def __str__(self):
        return self.name


class RequestType(models.Model):
    """ERD: REQUEST_TYPES — sub-types inside each category."""
    category = models.ForeignKey(
        RequestCategory, on_delete=models.PROTECT,
        related_name='types', verbose_name='التصنيف',
    )
    name = models.CharField('الاسم', max_length=150)
    requires_dates = models.BooleanField('يتطلب تواريخ', default=False)
    requires_attachment = models.BooleanField('يتطلب مرفق', default=False)
    is_leave_type = models.BooleanField('نوع إجازة', default=False)  # Added beyond ERD (from SQL) — triggers manning check

    class Meta:
        db_table = 'request_types'
        verbose_name = 'نوع طلب'
        verbose_name_plural = 'أنواع الطلبات'

    def __str__(self):
        return f'{self.category} / {self.name}'


class ApprovalChainStep(models.Model):
    """ERD: APPROVAL_CHAIN_STEPS — ordered approver roles per request type."""
    request_type = models.ForeignKey(
        RequestType, on_delete=models.CASCADE,
        related_name='chain_steps', verbose_name='نوع الطلب',
    )
    step_order = models.PositiveSmallIntegerField('ترتيب الخطوة')
    approver_role = models.CharField('دور المعتمد', max_length=30, choices=[
        ('OFFICER', 'ضابط / قائد'),
        ('FINANCE', 'الشؤون المالية'),
        ('ADMIN', 'مدير النظام'),
    ])

    class Meta:
        db_table = 'approval_chain_steps'
        ordering = ['request_type', 'step_order']
        verbose_name = 'خطوة اعتماد'
        verbose_name_plural = 'مسارات الاعتماد'
        constraints = [
            models.UniqueConstraint(fields=['request_type', 'step_order'], name='uq_chain_step_order'),
        ]

    def __str__(self):
        return f'{self.request_type} — {self.step_order}: {self.get_approver_role_display()}'


class Request(models.Model):
    """ERD: REQUESTS — the central table."""

    class Priority(models.TextChoices):
        NORMAL = 'NORMAL', 'عادي'
        URGENT = 'URGENT', 'عاجل'
        EMERGENCY = 'EMERGENCY', 'طارئ'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'قيد المراجعة'
        PENDING_EDIT = 'PENDING_EDIT', 'معاد للتعديل'
        APPROVED = 'APPROVED', 'معتمد'
        REJECTED = 'REJECTED', 'مرفوض'
        COMPLETED = 'COMPLETED', 'مكتمل'
        CANCELLED = 'CANCELLED', 'ملغى'

    request_number = models.CharField('رقم الطلب', max_length=30, unique=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='requests', verbose_name='مقدم الطلب',
    )
    request_type = models.ForeignKey(
        RequestType, on_delete=models.PROTECT,
        related_name='requests', verbose_name='نوع الطلب',
    )
    reason = models.TextField('السبب / التفاصيل', max_length=1000, blank=True)
    date_from = models.DateField('من تاريخ', null=True, blank=True)
    date_to = models.DateField('إلى تاريخ', null=True, blank=True)
    priority = models.CharField('الأولوية', max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField('الحالة', max_length=20, choices=Status.choices, default=Status.PENDING)
    manning_warning = models.BooleanField('تنبيه الحد الأدنى', default=False)
    current_step = models.PositiveSmallIntegerField('الخطوة الحالية', default=1)  # Added beyond ERD
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('آخر تحديث', auto_now=True)  # replaces Oracle trigger trg_requests_bu

    class Meta:
        db_table = 'requests'
        ordering = ['-created_at']
        verbose_name = 'طلب'
        verbose_name_plural = 'الطلبات'
        constraints = [
            models.CheckConstraint(
                condition=Q(date_from__isnull=True) | Q(date_to__isnull=True) | Q(date_to__gte=F('date_from')),
                name='ck_requests_dates',
            ),
        ]

    def __str__(self):
        return self.request_number


class Attachment(models.Model):
    """ERD: ATTACHMENTS — file_url is stored by Django's FileField as a path."""
    request = models.ForeignKey(
        Request, on_delete=models.CASCADE,
        related_name='attachments', verbose_name='الطلب',
    )
    file = models.FileField('الملف', upload_to='attachments/%Y/%m/')  # ERD: file_url
    file_name = models.CharField('اسم الملف', max_length=255)
    file_size = models.PositiveIntegerField('الحجم (بايت)', null=True, blank=True)
    uploaded_at = models.DateTimeField('تاريخ الرفع', auto_now_add=True)

    class Meta:
        db_table = 'attachments'
        verbose_name = 'مرفق'
        verbose_name_plural = 'المرفقات'

    def __str__(self):
        return self.file_name


class ApprovalAction(models.Model):
    """ERD: APPROVAL_ACTIONS — history of every decision on a request."""

    class Decision(models.TextChoices):
        APPROVE = 'APPROVE', 'اعتماد'
        REJECT = 'REJECT', 'رفض'
        RETURN = 'RETURN', 'إعادة للتعديل'
        FORWARD = 'FORWARD', 'إحالة'

    request = models.ForeignKey(
        Request, on_delete=models.PROTECT,
        related_name='actions', verbose_name='الطلب',
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='approval_actions', verbose_name='المعتمد',
    )
    decision = models.CharField('القرار', max_length=20, choices=Decision.choices)
    reason = models.TextField('السبب', max_length=1000, blank=True)
    manning_acknowledged = models.BooleanField('أقر بتنبيه الحد الأدنى', default=False)  # Added beyond ERD
    action_date = models.DateTimeField('تاريخ الإجراء', auto_now_add=True)

    class Meta:
        db_table = 'approval_actions'
        ordering = ['action_date']
        verbose_name = 'إجراء اعتماد'
        verbose_name_plural = 'سجل الاعتمادات'

    def __str__(self):
        return f'{self.request} — {self.get_decision_display()}'


class ManningCheckLog(models.Model):
    """Added beyond ERD — every minimum-manning check is recorded."""

    class Result(models.TextChoices):
        OK = 'OK', 'ضمن الحد'
        BELOW_MINIMUM = 'BELOW_MINIMUM', 'أقل من الحد الأدنى'

    site = models.ForeignKey('org.Site', on_delete=models.PROTECT, related_name='manning_checks', verbose_name='الموقع')
    request = models.ForeignKey(
        Request, on_delete=models.PROTECT, null=True, blank=True,
        related_name='manning_checks', verbose_name='الطلب',
    )
    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name='manning_checks', verbose_name='بواسطة',
    )
    date_from = models.DateField('من تاريخ')
    date_to = models.DateField('إلى تاريخ')
    result = models.CharField('النتيجة', max_length=20, choices=Result.choices)
    affected_dates = models.JSONField('الأيام المتأثرة', default=list, blank=True)
    checked_at = models.DateTimeField('وقت الفحص', auto_now_add=True)

    class Meta:
        db_table = 'manning_check_logs'
        ordering = ['-checked_at']
        verbose_name = 'فحص الحد الأدنى'
        verbose_name_plural = 'سجل فحص الحد الأدنى'

    def __str__(self):
        return f'{self.site} {self.date_from}→{self.date_to}: {self.result}'
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, military_id, full_name, password=None, **extra_fields):
        if not military_id:
            raise ValueError('الرقم العسكري مطلوب')
        user = self.model(military_id=military_id, full_name=full_name, **extra_fields)
        user.set_password(password)  # stores a secure hash, never the plain password
        user.save(using=self._db)
        return user

    def create_superuser(self, military_id, full_name, password=None, **extra_fields):
        extra_fields.setdefault('role', User.Role.ADMIN)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(military_id, full_name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """ERD: USERS — one table for soldiers, officers, finance and admins."""

    class Role(models.TextChoices):
        SOLDIER = 'SOLDIER', 'عسكري'
        OFFICER = 'OFFICER', 'ضابط / قائد'
        FINANCE = 'FINANCE', 'الشؤون المالية'
        ADMIN = 'ADMIN', 'مدير النظام'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'على رأس العمل'
        SUSPENDED = 'SUSPENDED', 'موقوف'
        TRANSFERRED = 'TRANSFERRED', 'منقول'

    military_id = models.CharField('الرقم العسكري', max_length=20, unique=True)
    full_name = models.CharField('الاسم الكامل', max_length=150)
    rank = models.CharField('الرتبة', max_length=50, blank=True)
    # ERD says NOT NULL. Nullable here only so the system admin can be created
    # before any unit exists; soldiers/officers are validated to have a unit.
    unit = models.ForeignKey(
        'org.Unit', on_delete=models.PROTECT, null=True, blank=True,
        related_name='members', verbose_name='الوحدة',
    )
    phone = models.CharField('الجوال', max_length=20, blank=True)
    email = models.EmailField('البريد الإلكتروني', max_length=150, blank=True)
    role = models.CharField('الدور', max_length=30, choices=Role.choices, default=Role.SOLDIER)
    status = models.CharField('الحالة', max_length=20, choices=Status.choices, default=Status.ACTIVE)
    failed_attempts = models.PositiveIntegerField('محاولات الدخول الفاشلة', default=0)  # Added beyond ERD (from SQL)
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'military_id'     # login with military ID
    REQUIRED_FIELDS = ['full_name']    # asked by createsuperuser

    class Meta:
        db_table = 'users'
        verbose_name = 'مستخدم'
        verbose_name_plural = 'المستخدمون'

    @property
    def is_active(self):
        # Django checks this on login: only ACTIVE users can sign in.
        return self.status == self.Status.ACTIVE

    @property
    def is_staff(self):
        # Django checks this to allow access to the admin site.
        return self.role == self.Role.ADMIN

    def __str__(self):
        return f'{self.rank} {self.full_name} ({self.military_id})'.strip()


    

class AuditLog(models.Model):
    """Added beyond ERD — append-only record of important actions."""
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='audit_logs', verbose_name='المستخدم',
    )
    action = models.CharField('الإجراء', max_length=50)          # e.g. SUBMIT_REQUEST, APPROVE, LOGIN_FAILED
    object_type = models.CharField('نوع الكائن', max_length=50, blank=True)  # e.g. Request
    object_id = models.CharField('معرف الكائن', max_length=50, blank=True)
    details = models.JSONField('تفاصيل', default=dict, blank=True)
    created_at = models.DateTimeField('الوقت', auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        verbose_name = 'سجل تدقيق'
        verbose_name_plural = 'سجل التدقيق'

    def __str__(self):
        return f'{self.created_at:%Y-%m-%d %H:%M} {self.action}'
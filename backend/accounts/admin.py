from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import AuditLog, User

class CustomUserCreationForm(UserCreationForm):
    """Form for 'Add user' — includes password + confirmation."""
    class Meta:
        model = User
        fields = ('military_id', 'full_name', 'rank', 'unit', 'role')


class CustomUserChangeForm(UserChangeForm):
    """Form for editing an existing user — password shown as hash only."""
    class Meta:
        model = User
        fields = '__all__'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    list_display = ('military_id', 'full_name', 'rank', 'unit', 'role', 'status')
    list_filter = ('role', 'status', 'unit__site')
    search_fields = ('military_id', 'full_name')
    ordering = ('military_id',)
    readonly_fields = ('last_login', 'created_at')

    # Edit page
    fieldsets = (
        ('بيانات الدخول', {'fields': ('military_id', 'password')}),
        ('البيانات الشخصية', {'fields': ('full_name', 'rank', 'phone', 'email')}),
        ('بيانات العمل', {'fields': ('unit', 'role', 'status', 'failed_attempts')}),
        ('الصلاحيات', {'fields': ('is_superuser', 'groups', 'user_permissions')}),
        ('تواريخ', {'fields': ('last_login', 'created_at')}),
    )

    # Add page
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('military_id', 'full_name', 'rank', 'unit', 'role',
                       'password1', 'password2'),
        }),

        
    )

    

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'user', 'action', 'object_type', 'object_id')
    list_filter = ('action', 'object_type')
    search_fields = ('user__military_id', 'object_id')

    # append-only: view only, nobody can add, edit or delete
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
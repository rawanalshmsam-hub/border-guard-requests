from django.contrib import admin

from .models import (
    ApprovalAction, ApprovalChainStep, Attachment, ManningCheckLog,
    Request, RequestCategory, RequestType,
)


@admin.register(RequestCategory)
class RequestCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon')


class ApprovalChainStepInline(admin.TabularInline):
    model = ApprovalChainStep
    extra = 1


@admin.register(RequestType)
class RequestTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'requires_dates', 'requires_attachment', 'is_leave_type')
    list_filter = ('category', 'is_leave_type')
    inlines = [ApprovalChainStepInline]


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0


class ApprovalActionInline(admin.TabularInline):
    model = ApprovalAction
    extra = 0
    can_delete = False
    readonly_fields = ('approver', 'decision', 'reason', 'manning_acknowledged', 'action_date')


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = ('request_number', 'user', 'request_type', 'status', 'priority',
                    'date_from', 'date_to', 'manning_warning', 'created_at')
    list_filter = ('status', 'priority', 'manning_warning', 'request_type__category')
    search_fields = ('request_number', 'user__military_id', 'user__full_name')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [AttachmentInline, ApprovalActionInline]

    def has_delete_permission(self, request, obj=None):
        return False  # business rule: requests are never hard-deleted, only CANCELLED


@admin.register(ManningCheckLog)
class ManningCheckLogAdmin(admin.ModelAdmin):
    list_display = ('site', 'date_from', 'date_to', 'result', 'request', 'checked_at')
    list_filter = ('result', 'site')

    # logs are append-only: view only
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
from django.contrib import admin

from .models import DutyRoster


@admin.register(DutyRoster)
class DutyRosterAdmin(admin.ModelAdmin):
    list_display = ('user', 'next_return_date', 'notes')
    search_fields = ('user__military_id', 'user__full_name')
from django.contrib import admin

from .models import Site, Unit


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ('name', 'minimum_manning_threshold')
    search_fields = ('name',)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'site', 'parent_unit')
    list_filter = ('site',)
    search_fields = ('name',)
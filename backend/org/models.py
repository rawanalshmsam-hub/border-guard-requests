from django.db import models


class Site(models.Model):
    """ERD: SITES — border site / center."""
    name = models.CharField('الاسم', max_length=150)
    minimum_manning_threshold = models.PositiveIntegerField('الحد الأدنى للتواجد')

    class Meta:
        db_table = 'sites'
        verbose_name = 'موقع'
        verbose_name_plural = 'المواقع'

    def __str__(self):
        return self.name


class Unit(models.Model):
    """ERD: UNITS — platoon / company / battalion, hierarchical (self-relation)."""
    name = models.CharField('الاسم', max_length=150)
    parent_unit = models.ForeignKey(
        'self', on_delete=models.PROTECT, null=True, blank=True,
        related_name='sub_units', verbose_name='الوحدة الأم',
    )
    site = models.ForeignKey(
        Site, on_delete=models.PROTECT, related_name='units', verbose_name='الموقع',
    )

    class Meta:
        db_table = 'units'
        verbose_name = 'وحدة'
        verbose_name_plural = 'الوحدات'

    def __str__(self):
        return self.name
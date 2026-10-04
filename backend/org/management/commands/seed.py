from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User
from calendar_app.models import DutyRoster
from org.models import Site, Unit
from requests_app.models import ApprovalChainStep, RequestCategory, RequestType

TEST_PASSWORD = 'Test@12345'

# From the ERD seed data (name, icon)
CATEGORIES = [
    ('خدمات الإجازات', 'briefcase'),
    ('الخدمات الإدارية', 'folder'),
    ('الخدمات المالية', 'credit-card'),
    ('النقل والانتداب', 'truck'),
    ('الخدمات الطبية', 'shield-plus'),
    ('خدمات التدريب', 'graduation-cap'),
]

# (category, type name, requires_dates, requires_attachment, is_leave_type, approval chain roles in order)
REQUEST_TYPES = [
    ('خدمات الإجازات', 'إجازة اعتيادية', True, False, True, ['OFFICER']),
    ('خدمات الإجازات', 'إجازة اضطرارية', True, False, True, ['OFFICER']),
    ('خدمات الإجازات', 'إجازة مرضية', True, True, True, ['OFFICER']),
    ('الخدمات الإدارية', 'طلب شهادة خدمة', False, False, False, ['OFFICER', 'ADMIN']),
    ('الخدمات الإدارية', 'تعديل بيانات شخصية', False, True, False, ['OFFICER', 'ADMIN']),
    ('الخدمات المالية', 'طلب بدل سكن', False, True, False, ['OFFICER', 'FINANCE']),
    ('الخدمات المالية', 'طلب تعريف بالراتب', False, False, False, ['FINANCE']),
    ('النقل والانتداب', 'طلب نقل', False, False, False, ['OFFICER', 'ADMIN']),
    ('النقل والانتداب', 'طلب انتداب', True, False, False, ['OFFICER', 'FINANCE']),
    ('الخدمات الطبية', 'مراجعة طبية', True, True, False, ['OFFICER']),
    ('خدمات التدريب', 'طلب دورة تدريبية', True, False, False, ['OFFICER', 'ADMIN']),
]


class Command(BaseCommand):
    help = 'Fill the database with test data (development only). Safe to run more than once.'

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('seed is for development only (DEBUG=False).')

        # ---- Sites ----
        north, _ = Site.objects.get_or_create(
            name='مركز الحدود الشمالي', defaults={'minimum_manning_threshold': 5})
        south, _ = Site.objects.get_or_create(
            name='مركز الحدود الجنوبي', defaults={'minimum_manning_threshold': 4})

        # ---- Units (hierarchy: battalion > company > platoon) ----
        battalion, _ = Unit.objects.get_or_create(name='الكتيبة الأولى', site=north)
        company, _ = Unit.objects.get_or_create(name='السرية الأولى', site=north, parent_unit=battalion)
        platoon1, _ = Unit.objects.get_or_create(name='الفصيل الأول', site=north, parent_unit=company)
        platoon2, _ = Unit.objects.get_or_create(name='الفصيل الثاني', site=south)

        # ---- Categories & types & approval chains ----
        categories = {}
        for name, icon in CATEGORIES:
            categories[name], _ = RequestCategory.objects.get_or_create(name=name, defaults={'icon': icon})

        for cat, name, dates, attach, leave, roles in REQUEST_TYPES:
            rtype, _ = RequestType.objects.update_or_create(
                category=categories[cat], name=name,
                defaults={'requires_dates': dates, 'requires_attachment': attach, 'is_leave_type': leave},
            )
            for order, role in enumerate(roles, start=1):
                ApprovalChainStep.objects.update_or_create(
                    request_type=rtype, step_order=order, defaults={'approver_role': role})
            rtype.chain_steps.filter(step_order__gt=len(roles)).delete()

        # ---- Users ----
        # North site: 6 soldiers + officer + finance = 8 people, minimum 5.
        # So 3 overlapping approved leaves = OK, the 4th = BELOW_MINIMUM warning.
        users = [
            ('1001', 'أحمد محمد العتيبي', 'جندي', platoon1, 'SOLDIER'),
            ('1002', 'خالد عبدالله القحطاني', 'جندي أول', platoon1, 'SOLDIER'),
            ('1003', 'فهد سعد الدوسري', 'عريف', platoon1, 'SOLDIER'),
            ('1004', 'سلطان ناصر الشمري', 'جندي', platoon1, 'SOLDIER'),
            ('1005', 'ماجد علي الحربي', 'جندي', platoon1, 'SOLDIER'),
            ('1006', 'عبدالرحمن صالح المطيري', 'رقيب', platoon1, 'SOLDIER'),
            ('2001', 'محمد إبراهيم الزهراني', 'ملازم أول', company, 'OFFICER'),
            ('3001', 'يوسف حمد السبيعي', 'رقيب أول', battalion, 'FINANCE'),
            # South site
            ('1101', 'تركي فيصل العنزي', 'جندي', platoon2, 'SOLDIER'),
            ('2101', 'نايف عمر الغامدي', 'نقيب', platoon2, 'OFFICER'),
        ]
        created = 0
        for mid, name, rank, unit, role in users:
            if not User.objects.filter(military_id=mid).exists():
                User.objects.create_user(mid, name, TEST_PASSWORD, rank=rank, unit=unit, role=role)
                created += 1

        # ---- Duty roster sample ----
        soldier = User.objects.get(military_id='1001')
        DutyRoster.objects.get_or_create(user=soldier, defaults={'notes': 'مناوبة الفصيل الأول'})

        self.stdout.write(self.style.SUCCESS(
            f'Seed done. Sites: {Site.objects.count()}, Units: {Unit.objects.count()}, '
            f'Types: {RequestType.objects.count()}, New users: {created}. '
            f'Test password: {TEST_PASSWORD}'
        ))
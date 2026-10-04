from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User
from calendar_app.models import DutyRoster
from org.models import Site, Unit
from requests_app.models import ApprovalChainStep, RequestCategory, RequestType

TEST_PASSWORD = 'Test@12345'

# 6 from the ERD seed + 4 from the UI design
CATEGORIES = [
    ('خدمات الإجازات', 'briefcase'),
    ('الخدمات الإدارية', 'folder'),
    ('الخدمات المالية', 'credit-card'),
    ('النقل والانتداب', 'truck'),
    ('الخدمات الطبية', 'shield-plus'),
    ('خدمات التدريب', 'graduation-cap'),
    ('خدمات التصاريح', 'id-card'),
    ('خدمات المعدات والعهد', 'package'),
    ('خدمات المستندات', 'file-text'),
    ('خدمات أخرى', 'plus-circle'),
]

# (category, type name, requires_dates, requires_attachment, is_leave_type, approval chain roles)
# PLACEHOLDER type names — replace in Django admin when the real list is available.
REQUEST_TYPES = [
    # خدمات الإجازات (5)
    ('خدمات الإجازات', 'إجازة اعتيادية', True, False, True, ['OFFICER']),
    ('خدمات الإجازات', 'إجازة اضطرارية', True, False, True, ['OFFICER']),
    ('خدمات الإجازات', 'إجازة مرضية', True, True, True, ['OFFICER']),
    ('خدمات الإجازات', 'إجازة عرضية', True, False, True, ['OFFICER']),
    ('خدمات الإجازات', 'تمديد إجازة', True, False, True, ['OFFICER']),
    # الخدمات الإدارية (5)
    ('الخدمات الإدارية', 'طلب شهادة خدمة', False, False, False, ['OFFICER', 'ADMIN']),
    ('الخدمات الإدارية', 'تعديل بيانات شخصية', False, True, False, ['OFFICER', 'ADMIN']),
    ('الخدمات الإدارية', 'طلب استئذان', True, False, False, ['OFFICER']),
    ('الخدمات الإدارية', 'طلب تظلم', False, False, False, ['OFFICER', 'ADMIN']),
    ('الخدمات الإدارية', 'طلب مقابلة القائد', False, False, False, ['OFFICER']),
    # الخدمات المالية (4)
    ('الخدمات المالية', 'طلب بدل سكن', False, True, False, ['OFFICER', 'FINANCE']),
    ('الخدمات المالية', 'طلب تعريف بالراتب', False, False, False, ['FINANCE']),
    ('الخدمات المالية', 'طلب سلفة', False, False, False, ['OFFICER', 'FINANCE']),
    ('الخدمات المالية', 'طلب تعويض مصروفات', False, True, False, ['OFFICER', 'FINANCE']),
    # النقل والانتداب (4)
    ('النقل والانتداب', 'طلب نقل', False, False, False, ['OFFICER', 'ADMIN']),
    ('النقل والانتداب', 'طلب انتداب', True, False, False, ['OFFICER', 'FINANCE']),
    ('النقل والانتداب', 'طلب تبادل وظيفي', False, False, False, ['OFFICER', 'ADMIN']),
    ('النقل والانتداب', 'طلب تمديد انتداب', True, False, False, ['OFFICER', 'FINANCE']),
    # الخدمات الطبية (4)
    ('الخدمات الطبية', 'مراجعة طبية', True, True, False, ['OFFICER']),
    ('الخدمات الطبية', 'طلب إحالة طبية', False, True, False, ['OFFICER']),
    ('الخدمات الطبية', 'طلب تقرير لياقة طبية', False, False, False, ['OFFICER', 'ADMIN']),
    ('الخدمات الطبية', 'طلب صرف علاج', False, True, False, ['OFFICER', 'FINANCE']),
    # خدمات التدريب (4)
    ('خدمات التدريب', 'طلب دورة تدريبية', True, False, False, ['OFFICER', 'ADMIN']),
    ('خدمات التدريب', 'طلب ابتعاث', True, True, False, ['OFFICER', 'ADMIN']),
    ('خدمات التدريب', 'طلب شهادة دورة', False, False, False, ['ADMIN']),
    ('خدمات التدريب', 'طلب تأجيل دورة', False, False, False, ['OFFICER', 'ADMIN']),
    # خدمات التصاريح (4)
    ('خدمات التصاريح', 'تصريح دخول موقع', True, False, False, ['OFFICER']),
    ('خدمات التصاريح', 'تصريح مركبة', False, True, False, ['OFFICER']),
    ('خدمات التصاريح', 'تصريح سفر', True, False, False, ['OFFICER', 'ADMIN']),
    ('خدمات التصاريح', 'تصريح إدخال جهاز', False, False, False, ['OFFICER']),
    # خدمات المعدات والعهد (4)
    ('خدمات المعدات والعهد', 'طلب صرف عهدة', False, False, False, ['OFFICER']),
    ('خدمات المعدات والعهد', 'طلب إرجاع عهدة', False, False, False, ['OFFICER']),
    ('خدمات المعدات والعهد', 'بلاغ تلف عهدة', False, True, False, ['OFFICER']),
    ('خدمات المعدات والعهد', 'طلب استبدال معدات', False, False, False, ['OFFICER']),
    # خدمات المستندات (4)
    ('خدمات المستندات', 'بدل فاقد بطاقة عسكرية', False, True, False, ['OFFICER', 'ADMIN']),
    ('خدمات المستندات', 'طلب خطاب تعريف', False, False, False, ['ADMIN']),
    ('خدمات المستندات', 'طلب نسخة قرار', False, False, False, ['ADMIN']),
    ('خدمات المستندات', 'طلب تصديق مستند', False, True, False, ['ADMIN']),
    # خدمات أخرى (6)
    ('خدمات أخرى', 'طلب عام', False, False, False, ['OFFICER']),
    ('خدمات أخرى', 'اقتراح', False, False, False, ['OFFICER']),
    ('خدمات أخرى', 'شكوى', False, False, False, ['OFFICER', 'ADMIN']),
    ('خدمات أخرى', 'طلب سكن', False, True, False, ['OFFICER', 'ADMIN']),
    ('خدمات أخرى', 'طلب مساعدة اجتماعية', False, True, False, ['OFFICER', 'ADMIN']),
    ('خدمات أخرى', 'طلب إفادة', False, False, False, ['ADMIN']),
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
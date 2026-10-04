import os

from django.conf import settings
from django.db import transaction

from accounts.services import log_action
from config.errors import ServiceError
from requests_app.models import Attachment, Request

# First bytes of each real file type ("magic numbers")
SIGNATURES = {
    'pdf': [b'%PDF'],
    'jpg': [b'\xff\xd8\xff'],
    'jpeg': [b'\xff\xd8\xff'],
    'png': [b'\x89PNG'],
}


def validate_files(files, existing_count=0):
    max_files = settings.ATTACHMENT_MAX_FILES
    max_bytes = settings.ATTACHMENT_MAX_SIZE_MB * 1024 * 1024

    if existing_count + len(files) > max_files:
        raise ServiceError('E204', f'الحد الأقصى للمرفقات {max_files} ملفات', field='files')

    for f in files:
        ext = os.path.splitext(f.name)[1].lower().lstrip('.')
        if ext not in settings.ATTACHMENT_ALLOWED_EXTENSIONS:
            raise ServiceError('E204', f'نوع الملف غير مسموح: {f.name} (المسموح PDF, JPG, PNG)', field='files')
        if f.size > max_bytes:
            raise ServiceError('E204', f'حجم الملف أكبر من {settings.ATTACHMENT_MAX_SIZE_MB} ميجابايت: {f.name}', field='files')
        head = f.read(8)
        f.seek(0)
        signatures = SIGNATURES.get(ext)
        if signatures and not any(head.startswith(s) for s in signatures):
            raise ServiceError('E204', f'محتوى الملف لا يطابق نوعه: {f.name}', field='files')


def save_attachments(request_obj, files):
    for f in files:
        Attachment.objects.create(
            request=request_obj, file=f, file_name=f.name[:255], file_size=f.size,
        )


@transaction.atomic
def add_attachments(user, request_id, files):
    """API 1.2 — add files to an existing request (owner only, while still editable)."""
    req = Request.objects.filter(pk=request_id, user=user).first()
    if req is None:
        raise ServiceError('E202', 'الطلب غير موجود', status=404)
    if req.status not in (Request.Status.PENDING, Request.Status.PENDING_EDIT):
        raise ServiceError('E202', 'لا يمكن إضافة مرفقات لطلب بهذه الحالة')
    if not files:
        raise ServiceError('E204', 'لم يتم اختيار أي ملف', field='files')

    validate_files(files, existing_count=req.attachments.count())
    save_attachments(req, files)
    log_action(user, 'ADD_ATTACHMENT', req, files=[f.name for f in files])
    return req
import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class ServiceError(Exception):
    """Business-rule error raised inside services; returned as {"code", "message", ...}."""

    def __init__(self, code, message, status=400, field=None, extra=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.field = field
        self.extra = extra or {}   # e.g. affected_dates for E405


def api_error(code, message, status=400, field=None, extra=None):
    """Unified error format for the whole API."""
    data = {'code': code, 'message': message}
    if field:
        data['field'] = field
    if extra:
        data.update(extra)
    return Response(data, status=status)


def custom_exception_handler(exc, context):
    if isinstance(exc, ServiceError):
        return api_error(exc.code, exc.message, exc.status, exc.field, exc.extra)

    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict) and 'detail' in response.data:
            response.data = {'code': getattr(exc, 'default_code', 'error'),
                             'message': str(response.data['detail'])}
        return response

    logger.exception('Unexpected error', exc_info=exc)
    return api_error('E999', 'حدث خطأ غير متوقع، حاول لاحقاً', 500)
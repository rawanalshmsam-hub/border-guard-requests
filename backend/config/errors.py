import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class ServiceError(Exception):
    """Business-rule error raised inside services; returned as {"code", "message"}."""

    def __init__(self, code, message, status=400, field=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.field = field


def api_error(code, message, status=400, field=None):
    """Unified error format for the whole API."""
    data = {'code': code, 'message': message}
    if field:
        data['field'] = field   # lets the form highlight the wrong input
    return Response(data, status=status)


def custom_exception_handler(exc, context):
    # 1) Our business errors
    if isinstance(exc, ServiceError):
        return api_error(exc.code, exc.message, exc.status, exc.field)

    # 2) DRF errors (401 no token, 404, ...) -> same {code, message} shape
    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict) and 'detail' in response.data:
            response.data = {'code': getattr(exc, 'default_code', 'error'),
                             'message': str(response.data['detail'])}
        return response

    # 3) Anything unexpected -> E999 (full traceback goes to the server terminal)
    logger.exception('Unexpected error', exc_info=exc)
    return api_error('E999', 'حدث خطأ غير متوقع، حاول لاحقاً', 500)
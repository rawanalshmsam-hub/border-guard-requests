from rest_framework.response import Response


def api_error(code, message, status=400):
    """Unified error format for the whole API: {"code": "E102", "message": "..."}."""
    return Response({'code': code, 'message': message}, status=status)
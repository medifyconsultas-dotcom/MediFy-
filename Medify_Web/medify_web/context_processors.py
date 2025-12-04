from django.conf import settings


def default_ai_model(request):
    """Context processor that injects the default AI model name into template context.
    Templates can read `DEFAULT_AI_MODEL` to discover which model to use.
    """
    return {
        'DEFAULT_AI_MODEL': getattr(settings, 'DEFAULT_AI_MODEL', None)
    }

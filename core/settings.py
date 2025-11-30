"""
Django settings for core project.
"""

import os
import json
import base64
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore
import dj_database_url

# =====================================================================
# BASE DIR
# =====================================================================
BASE_DIR = Path(__file__).resolve().parent.parent

# =====================================================================
# SECURITY
# =====================================================================
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = [
    '*',
    os.environ.get("RAILWAY_PUBLIC_DOMAIN", ""),
    os.environ.get("RAILWAY_PRIVATE_DOMAIN", ""),
]

# =====================================================================
# FIREBASE INIT
# =====================================================================
firebase_sa = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
cred = None

if firebase_sa:
    try:
        cred_dict = json.loads(firebase_sa)
    except Exception:
        try:
            cred_json = base64.b64decode(firebase_sa).decode('utf-8')
            cred_dict = json.loads(cred_json)
        except Exception:
            cred_dict = None

    if cred_dict:
        cred = credentials.Certificate(cred_dict)
else:
    fallback_path = os.path.join(BASE_DIR, "core", "firebase_key.json")
    if os.path.exists(fallback_path):
        cred = credentials.Certificate(fallback_path)

if cred:
    try:
        firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception:
        db = None
else:
    db = None

# =====================================================================
# APPLICATIONS
# =====================================================================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'medify_web',
]

# =====================================================================
# MIDDLEWARE
# =====================================================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'medify_web.middleware.session_security.SessionSecurityMiddleware',

    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',

    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# =====================================================================
# URLS / WSGI
# =====================================================================
ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'

# =====================================================================
# TEMPLATES
# =====================================================================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',

                'medify_web.context_processors.default_ai_model',
            ],
        },
    },
]

# =====================================================================
# DATABASE — Usa Railway ou SQLite fallback
# =====================================================================
DATABASES = {
    'default': dj_database_url.config(default='sqlite:///db.sqlite3')
}

# =====================================================================
# PASSWORD VALIDATION
# =====================================================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# =====================================================================
# I18N
# =====================================================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# =====================================================================
# STATIC FILES
# =====================================================================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# =====================================================================
# MEDIA
# =====================================================================
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# =====================================================================
# DEFAULT PK
# =====================================================================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =====================================================================
# SESSION SECURITY
# =====================================================================
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False  # Em produção: True

CSRF_COOKIE_SECURE = False
CSRF_COOKIE_SAMESITE = 'Lax'

SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = False
SESSION_LAST_ACTIVITY_GRANULARITY = 60

SESSION_IDLE_TIMEOUT = 60 * 30
SESSION_ABSOLUTE_TIMEOUT = 60 * 60 * 24 * 7

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# =====================================================================
# AI MODEL CONFIG
# =====================================================================
DEFAULT_AI_MODEL = 'claude-haiku-4.5'

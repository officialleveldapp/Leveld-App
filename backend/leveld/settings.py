import os
from pathlib import Path
from datetime import timedelta

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# --- Core flags (production-safe defaults) ---------------------------------
# Local dev: set DEBUG=True and DJANGO_SECRET_KEY in backend/.env
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', '').strip()
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-only-not-for-production'
    else:
        raise ImproperlyConfigured(
            'Set DJANGO_SECRET_KEY in the environment before running with DEBUG=False.'
        )

_hosts_raw = os.getenv('ALLOWED_HOSTS', '').strip()
if DEBUG:
    ALLOWED_HOSTS = [
        h.strip()
        for h in (_hosts_raw or 'localhost,127.0.0.1').split(',')
        if h.strip()
    ] or ['localhost', '127.0.0.1']
else:
    if not _hosts_raw:
        raise ImproperlyConfigured(
            'Set ALLOWED_HOSTS to a comma-separated list (e.g. your-app.up.railway.app).'
        )
    ALLOWED_HOSTS = [h.strip() for h in _hosts_raw.split(',') if h.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    # Local
    'core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'leveld.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'leveld.wsgi.application'

# --- Database --------------------------------------------------------------
if os.getenv('DATABASE_URL', '').strip():
    DATABASES = {
        'default': dj_database_url.config(conn_max_age=600),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'leveld'),
            'USER': os.getenv('DB_USER', 'rahbe'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- HTTPS / proxy (Railway, Heroku, etc.) --------------------------------
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

if not DEBUG:
    # Off by default: many PaaS (e.g. Railway) terminate TLS at the edge; opt in if you need
    # in-app redirects from HTTP→HTTPS.
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() in (
        'true',
        '1',
        'yes',
    )
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# --- Django REST Framework -------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': None,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/minute',
        'user': '2000/minute',
    },
}

# --- Simple JWT -----------------------------------------------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# --- CORS -----------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = DEBUG
_cors_raw = os.getenv('CORS_ALLOWED_ORIGINS', '').strip()
# Never use ''.split(',') alone — that becomes [''] and breaks CORS matching.
CORS_ALLOWED_ORIGINS = [x.strip() for x in _cors_raw.split(',') if x.strip()]

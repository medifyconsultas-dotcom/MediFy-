#!/usr/bin/env bash
set -e

# If FIREBASE_SERVICE_ACCOUNT env var is provided (JSON string), write it
if [ -n "$FIREBASE_SERVICE_ACCOUNT" ]; then
  echo "$FIREBASE_SERVICE_ACCOUNT" > core/firebase_key.json
fi

# Run migrations and collectstatic, then start Gunicorn
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear

exec gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000}

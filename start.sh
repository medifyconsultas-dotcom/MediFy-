#!/usr/bin/env bash
set -e

# Escrever chave do Firebase a partir da variável FIREBASE_SERVICE_ACCOUNT
if [ -n "$FIREBASE_SERVICE_ACCOUNT" ]; then
  echo "$FIREBASE_SERVICE_ACCOUNT" > core/firebase_key.json
fi

# Se você armazenou em base64 no env, descomente e use:
# echo "$FIREBASE_SERVICE_ACCOUNT_B64" | base64 -d > core/firebase_key.json

# Rodar migrações
python manage.py migrate --noinput

# Coletar arquivos estáticos
python manage.py collectstatic --noinput

# Iniciar Gunicorn (usa $PORT provido pelo Railway)
gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3

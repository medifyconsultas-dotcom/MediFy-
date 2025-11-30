#!/usr/bin/env sh
set -e

echo "==> Criando firebase_key.json..."

# Criar core/firebase_key.json a partir da env FIREBASE_SERVICE_ACCOUNT
mkdir -p core

if [ -n "$FIREBASE_SERVICE_ACCOUNT" ]; then
  case "$FIREBASE_SERVICE_ACCOUNT" in
    '{'*)
      # JSON puro
      printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > core/firebase_key.json
      ;;
    *)
      # tenta decodificar base64; se falhar grava como texto normal
      printf '%s' "$FIREBASE_SERVICE_ACCOUNT" | base64 -d > core/firebase_key.json 2>/dev/null \
        || printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > core/firebase_key.json
      ;;
  esac
  echo "Firebase key escrita em core/firebase_key.json"
else
  echo "FIREBASE_SERVICE_ACCOUNT não definida! Firebase NÃO VAI FUNCIONAR."
fi

echo "==> Instalando dependências..."
python -m pip install --upgrade pip setuptools wheel || true

if [ -f requirements.txt ]; then
  python -m pip install -r requirements.txt
fi

echo "==> Rodando migrations..."
python manage.py migrate --noinput || true

echo "==> Coletando arquivos estáticos..."
python manage.py collectstatic --noinput || true

echo "==> Iniciando Gunicorn..."
exec gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3

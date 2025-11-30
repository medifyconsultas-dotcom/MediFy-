#!/usr/bin/env sh
set -e

# Gera core/firebase_key.json a partir da env FIREBASE_SERVICE_ACCOUNT
if [ -n "$FIREBASE_SERVICE_ACCOUNT" ]; then
  # Se começar com '{' provavelmente é JSON cru
  case "$FIREBASE_SERVICE_ACCOUNT" in
    '{'*)
      printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > core/firebase_key.json
      ;;
    *)
      # tenta decodificar base64, se falhar grava o conteúdo cru
      printf '%s' "$FIREBASE_SERVICE_ACCOUNT" | base64 -d > core/firebase_key.json 2>/dev/null || printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > core/firebase_key.json
      ;;
  esac
  echo "Wrote core/firebase_key.json from FIREBASE_SERVICE_ACCOUNT"
else
  echo "FIREBASE_SERVICE_ACCOUNT not set; skipping firebase key creation"
fi

# Atualiza pip e instala dependências
python -m pip install --upgrade pip setuptools wheel || true
if [ -f requirements.txt ]; then
  python -m pip install -r requirements.txt
fi

# Executa migrations e collectstatic
python manage.py migrate --noinput || true
python manage.py collectstatic --noinput || true

# Inicia Gunicorn (Railway fornece $PORT)
exec gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3
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

#!/usr/bin/env sh
set -e

# Determina o diretório do script e executa nele (garante caminhos corretos)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Diagnostic info (no secret output)
echo "start.sh running in: $SCRIPT_DIR"
echo "Current user: $(whoami 2>/dev/null || echo unknown)"
echo "Listing script dir:"
ls -la "$SCRIPT_DIR" || true

# Garante que a pasta core/ exista antes de escrever a chave
if [ -n "$FIREBASE_SERVICE_ACCOUNT" ]; then
  mkdir -p "$SCRIPT_DIR/core"
  # Se começar com '{' provavelmente é JSON cru
  case "$FIREBASE_SERVICE_ACCOUNT" in
    '{'*)
      printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$SCRIPT_DIR/core/firebase_key.json"
      ;;
    *)
      # tenta decodificar base64, se falhar grava o conteúdo cru
      printf '%s' "$FIREBASE_SERVICE_ACCOUNT" | base64 -d > "$SCRIPT_DIR/core/firebase_key.json" 2>/dev/null || printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$SCRIPT_DIR/core/firebase_key.json"
      ;;
  esac
  echo "Wrote core/firebase_key.json from FIREBASE_SERVICE_ACCOUNT (to $SCRIPT_DIR/core/firebase_key.json)"
else
  echo "FIREBASE_SERVICE_ACCOUNT not set; skipping firebase key creation"
fi

# Atualiza pip e instala dependências (se houver requirements.txt no mesmo diretório)
python -m pip install --upgrade pip setuptools wheel || true
if [ -f requirements.txt ]; then
  python -m pip install -r requirements.txt
fi

# Executa migrations e collectstatic
if [ -f manage.py ]; then
  python manage.py migrate --noinput || true
  python manage.py collectstatic --noinput || true
else
  echo "manage.py not found in $SCRIPT_DIR; skipping migrate/collectstatic"
fi

# Inicia Gunicorn (Railway fornece $PORT)
exec gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3

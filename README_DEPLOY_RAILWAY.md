# Deploy Medify_Web no Railway

Este documento descreve, passo-a-passo, como preparar e implantar o aplicativo Django `Medify_Web` no Railway.

ATENÇÃO: não comite chaves privadas (ex.: `core/firebase_key.json`) em repositórios públicos.

## 1 — Pré-requisitos

- Ter o código do `Medify_Web` no repositório (pasta `Medify_Web` no projeto). Você informou o repositório: https://github.com/medifyconsultas-dotcom/MediFy-/tree/Web
- Ter `requirements.txt` com dependências (já incluí um arquivo base). Verifique localmente e gere a lista correta com seu venv se necessário.
- Ter `start.sh` e `Procfile` (já incluídos no repositório local). Eles executam migrações, coletam statics e iniciam `gunicorn`.

## 2 — Remover credenciais do repo (crucial)

Se `core/firebase_key.json` estiver no repositório, remova do índice e adicione ao `.gitignore`:

```powershell
cd "C:\Users\Usuario\Documents\Lab Multi\Projeto_MediFy\basic app\Medify_Web"
git rm --cached core/firebase_key.json
git add .gitignore
git commit -m "Remove firebase key from repo and ignore it"
```

Se a chave foi exposta publicamente, gere uma nova service account e revogue a antiga no Console do Firebase.

## 3 — Ajustes em `settings.py` (já aplicados localmente)

- `core/settings.py` foi atualizado para:
  - Ler `SECRET_KEY`, `DEBUG` e `ALLOWED_HOSTS` via variáveis de ambiente.
  - Usar `dj-database-url` para `DATABASES` (usa `DATABASE_URL` do Railway quando existir).
  - Inicializar Firebase a partir da variável `FIREBASE_SERVICE_ACCOUNT` (aceita JSON cru ou base64), com fallback para `core/firebase_key.json` apenas em dev.
  - Integrar `whitenoise` para servir arquivos estáticos e configurar `STATIC_ROOT`/`STATICFILES_STORAGE`.

## 4 — Arquivos criados/localizados

- `start.sh` — escreve `core/firebase_key.json` a partir de `FIREBASE_SERVICE_ACCOUNT`, roda `migrate`, `collectstatic` e inicia `gunicorn`.
- `Procfile` — `web: ./start.sh`.
- `requirements.txt` — dependências base (`Django`, `gunicorn`, `whitenoise`, `dj-database-url`, `psycopg2-binary`, `firebase-admin`).
- `.gitignore` — já configurado para ignorar `core/firebase_key.json`, `db.sqlite3`, venv e outros artefatos.

## 5 — Variáveis de ambiente necessárias (defina no Railway)

- `SECRET_KEY` — string secreta segura.
- `DEBUG` — `False`.
- `ALLOWED_HOSTS` — ex.: `your-app.up.railway.app` (ou `*` temporariamente).
- `FIREBASE_SERVICE_ACCOUNT` — o conteúdo JSON da service account (cole o JSON inteiro) — ou use `FIREBASE_SERVICE_ACCOUNT_B64` (base64) e ajuste `start.sh` conforme desejado.
- `DATABASE_URL` — se adicionar PostgreSQL via plugin no Railway esse valor será fornecido automaticamente.
- Outros: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `GS_BUCKET_NAME`, etc. (se aplicável).

## 6 — Deploy no Railway (passo-a-passo)

1. Faça commit e push das mudanças para o repositório remoto (GitHub):

```powershell
git add .
git commit -m "Prepare Medify_Web for Railway: start.sh, Procfile, env-based settings"
git push origin main
```

2. Acesse https://railway.app/ e crie um novo projeto → Deploy from GitHub. Conecte o repositório `MediFy-/Web` (ou seu fork).

3. Ao criar o serviço, defina `Project Root` como `Medify_Web` (importante: é onde está o `manage.py` e `requirements.txt`).

4. Em Build settings (opcional): `pip install -r requirements.txt`. Se usar `Procfile`, deixe Start command em branco.

5. Em Settings → Variables, adicione as variáveis listadas na seção 5.

6. (Recomendado) Add Plugin → PostgreSQL (Railway) para banco persistente. O plugin injeta `DATABASE_URL` automaticamente.

7. Deploy: clique para puxar o branch e iniciar o build. O `start.sh` irá:
   - Escrever `core/firebase_key.json` a partir de `FIREBASE_SERVICE_ACCOUNT`.
   - Rodar `python manage.py migrate --noinput`.
   - Rodar `python manage.py collectstatic --noinput`.
   - Iniciar `gunicorn core.wsgi:application`.

## 7 — Verificação e debug

- Acompanhe os logs (Build + Runtime) no Railway → Service → Logs.
- Erros comuns:
  - `psycopg2` / erro de dependência: adicione `psycopg2-binary` ao `requirements.txt`.
  - Erro ao carregar Firebase: JSON inválido em `FIREBASE_SERVICE_ACCOUNT`.
  - `collectstatic` falhando: verifique permissões/erros de import em settings.

## 8 — Execução local para testar antes do deploy

```powershell
cd "C:\Users\Usuario\Documents\Lab Multi\Projeto_MediFy\basic app\Medify_Web"
# Ative venv se houver
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
# Testar gunicorn local (somente se gunicorn estiver instalado localmente)
$env:PORT=8000
gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 3
```

## 9 — Observações finais

- Recomendado: configurar armazenamento persistente para `MEDIA` (Google Cloud Storage ou S3) — o filesystem do Railway é efêmero.
- Não deixe `DEBUG=True` em produção.
- Se quiser que eu gere um `Dockerfile` ou configure CI (GitHub Actions) para testes + deploy automático, solicite.

---

Se preferir, eu posso também criar um arquivo `railway.template.json` com variáveis de ambiente padrão para importar no Railway, ou ajudar a conectar o repositório ao Railway passo-a-passo.
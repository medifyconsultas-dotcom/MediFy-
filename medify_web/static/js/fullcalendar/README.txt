Coloque aqui os arquivos do FullCalendar como fallback local caso o CDN não esteja acessível.

Arquivos esperados:
- main.min.js (FullCalendar v6.x)
- main.min.css (se quiser sobrescrever localmente, mas o template já referencia o CSS via CDN)

Como baixar via PowerShell (Windows):

# Cria a pasta
mkdir -p static/js/fullcalendar
# Baixa o JS (substitua a versão se necessário)
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/main.min.js" -OutFile "static/js/fullcalendar/main.min.js"

Se preferir, baixe manualmente do CDN e coloque o arquivo em static/js/fullcalendar/.

Depois de colocar o arquivo, recarregue a página do Django (`python manage.py runserver`) e abra a agenda novamente.

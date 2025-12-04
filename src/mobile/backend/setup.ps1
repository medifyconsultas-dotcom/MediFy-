# Script de setup automático do backend mobile
Write-Host "🚀 Configurando Backend Mobile Medify" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script no diretório src/mobile/backend" -ForegroundColor Red
    exit 1
}

# 1. Verificar Node.js
Write-Host "1️⃣ Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js não encontrado. Instale Node.js 18+ primeiro." -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Node.js $nodeVersion encontrado" -ForegroundColor Green

# 2. Instalar dependências
Write-Host "`n2️⃣ Instalando dependências..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Dependências instaladas" -ForegroundColor Green

# 3. Verificar arquivo .env
Write-Host "`n3️⃣ Verificando arquivo .env..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "   ⚠️ Arquivo .env não encontrado" -ForegroundColor Yellow
    Write-Host "   📝 Criando arquivo .env a partir do env.example..." -ForegroundColor Cyan
    
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Host "   ✅ Arquivo .env criado" -ForegroundColor Green
        Write-Host "   ⚠️ IMPORTANTE: Edite o arquivo .env com suas credenciais do Firebase!" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Arquivo env.example não encontrado" -ForegroundColor Red
    }
} else {
    Write-Host "   ✅ Arquivo .env encontrado" -ForegroundColor Green
}

# 4. Descobrir IP
Write-Host "`n4️⃣ Descobrindo IP local..." -ForegroundColor Yellow
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*"
} | Select-Object -ExpandProperty IPAddress

if ($ipAddresses) {
    $mainIP = $ipAddresses[0]
    Write-Host "   ✅ IP encontrado: $mainIP" -ForegroundColor Green
    Write-Host "`n📝 Configure no mobile-app/src/api/config.ts:" -ForegroundColor Cyan
    Write-Host "   export const API_BASE_URL = 'http://$mainIP:3001';" -ForegroundColor White
} else {
    Write-Host "   ⚠️ Nenhum IP local encontrado" -ForegroundColor Yellow
}

# 5. Verificar Firebase
Write-Host "`n5️⃣ Verificando configuração do Firebase..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "FIREBASE_PROJECT_ID=medify-401a8" -or $envContent -match "FIREBASE_PROJECT_ID=your-project-id") {
        Write-Host "   ⚠️ Firebase não configurado. Configure no arquivo .env" -ForegroundColor Yellow
        Write-Host "   📖 Veja SETUP-MOBILE.md para instruções detalhadas" -ForegroundColor Cyan
    } else {
        Write-Host "   ✅ Firebase parece estar configurado" -ForegroundColor Green
    }
}

# Resumo
Write-Host "`n" -NoNewline
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "✅ Setup concluído!" -ForegroundColor Green
Write-Host "`nPróximos passos:" -ForegroundColor Yellow
Write-Host "1. Configure o arquivo .env com suas credenciais do Firebase" -ForegroundColor White
Write-Host "2. Configure o IP no mobile-app/src/api/config.ts" -ForegroundColor White
Write-Host "3. Execute: npm run dev" -ForegroundColor White
Write-Host "4. Teste: http://localhost:3001/health" -ForegroundColor White
Write-Host "`n📖 Para mais detalhes, veja SETUP-MOBILE.md" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan


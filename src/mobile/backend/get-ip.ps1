# Script PowerShell para descobrir o IP local
Write-Host "🔍 Procurando IP local..." -ForegroundColor Cyan

$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*"
} | Select-Object -ExpandProperty IPAddress

if ($ipAddresses) {
    Write-Host "`n✅ IPs encontrados:" -ForegroundColor Green
    foreach ($ip in $ipAddresses) {
        Write-Host "   $ip" -ForegroundColor Yellow
    }
    Write-Host "`n📝 Configure no mobile-app/src/api/config.ts:" -ForegroundColor Cyan
    Write-Host "   export const API_BASE_URL = 'http://$($ipAddresses[0]):3001';" -ForegroundColor White
} else {
    Write-Host "❌ Nenhum IP local encontrado" -ForegroundColor Red
}

Write-Host "`nPressione qualquer tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


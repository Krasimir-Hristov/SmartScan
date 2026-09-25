#Requires -Version 5.1
<#
.SYNOPSIS
    Стартира FastAPI бекенда на SmartScan Stay (Uvicorn + hot reload).

.DESCRIPTION
    Тънка обвивка около "uv run uvicorn app.main:app --reload", която работи
    от всяка директория. Еквивалент на:
        cd backend
        uv run uvicorn app.main:app --reload --port 8000

    Кратки начини за стартиране:
        .\scripts\dev-backend.ps1      # директно (или scripts\dev-backend.cmd от cmd.exe)
        bdev                           # чрез функцията в PowerShell профила
        Ctrl+Shift+B                   # VS Code default build task

.PARAMETER Port
    TCP порт за слушане. По подразбиране: 8000 (съвпада с frontend проксито).

.PARAMETER BindHost
    Мрежови интерфейс. По подразбиране: 127.0.0.1 (само локален достъп).
    Използвай 0.0.0.0, за да тестваш PWA-то от телефон в същата Wi-Fi мрежа.

.PARAMETER NoReload
    Изключва Uvicorn hot reload (напр. за бърз performance тест).

.EXAMPLE
    .\scripts\dev-backend.ps1
.EXAMPLE
    .\scripts\dev-backend.ps1 -Port 9000 -NoReload
.EXAMPLE
    .\scripts\dev-backend.ps1 -BindHost 0.0.0.0
#>
[CmdletBinding()]
param(
    [int]$Port = 8000,
    [string]$BindHost = "127.0.0.1",
    [switch]$NoReload
)

$ErrorActionPreference = "Stop"

# Всички пътища се изчисляват спрямо репото, независимо от текущата директория.
$repoRoot   = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$mainModule = Join-Path $backendDir "app\main.py"

if (-not (Test-Path $mainModule)) {
    Write-Host "[X] Липсва входната точка на бекенда: $mainModule" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "[X] 'uv' не е намерен в PATH. Инсталирай го от https://docs.astral.sh/uv/" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $backendDir ".env"))) {
    Write-Host "[!] backend\.env липсва - ще се използват настройките по подразбиране (без Supabase/OpenRouter ключове)." -ForegroundColor Yellow
}

# Uvicorn аргументи; hot reload е включен по подразбиране за локална разработка.
$uvicornArgs = @("run", "uvicorn", "app.main:app", "--host", $BindHost, "--port", "$Port")
if (-not $NoReload) {
    $uvicornArgs += "--reload"
}

Write-Host ""
Write-Host "  SmartScan Stay API" -ForegroundColor Cyan
Write-Host "  Swagger UI : http://${BindHost}:$Port/docs"
Write-Host "  Health     : http://${BindHost}:$Port/api/py/health"
Write-Host "  Reload     : $(if ($NoReload) { 'off' } else { 'on' })"
Write-Host ""

Push-Location $backendDir
try {
    & uv @uvicornArgs
    $exitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

exit $exitCode

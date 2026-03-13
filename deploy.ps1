# Деплой MyWebApi на сервер

param(
    [switch]$SkipBuild,   # Пропустить сборку
    [switch]$SkipRestart  # Пропустить перезапуск сервиса
)

$ErrorActionPreference = "Stop"

$SERVER = "95.182.121.83"
$USER = "deploy"
$REMOTE_PATH = "/var/www/myapp/publish"
$PROJECT_ROOT = $PSScriptRoot

Write-Host "=== MyWebApi Deploy ===" -ForegroundColor Cyan
Write-Host "Сервер: $USER@$SERVER" -ForegroundColor Gray
Write-Host ""

# --- 1. Сборка ---
if (-not $SkipBuild) {
    Write-Host "[1/4] Сборка фронтенда..." -ForegroundColor Yellow
    Push-Location (Join-Path $PROJECT_ROOT "client-app")
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Ошибка сборки фронтенда" }
    Pop-Location

    Write-Host "[2/4] Сборка бэкенда..." -ForegroundColor Yellow
    Push-Location $PROJECT_ROOT
    dotnet publish -c Release -o ./publish 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Ошибка сборки бэкенда" }
    Pop-Location
    Write-Host "      OK" -ForegroundColor Green
} else {
    Write-Host "[1-2/4] Сборка пропущена (-SkipBuild)" -ForegroundColor Gray
}

# --- 2. Загрузка на сервер (только изменённые файлы) ---
Write-Host "[3/4] Загрузка на сервер..." -ForegroundColor Yellow
$publishPath = Join-Path $PROJECT_ROOT "publish"

# Проверяем наличие rsync (через WSL или Git Bash) — передаёт только изменённые файлы
$useRsync = $false
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    $rsyncCheck = wsl which rsync 2>$null
    if ($LASTEXITCODE -eq 0) { $useRsync = $true }
}

if ($useRsync) {
    # rsync: только изменённые файлы, быстрее при повторных деплоях
    Write-Host "      Используется rsync (инкрементальная загрузка)" -ForegroundColor Gray
    $publishPathUnix = (wsl wslpath -a $publishPath).Trim().Replace("'", "'\''")
    $remote = "$USER@${SERVER}:$REMOTE_PATH/"
    wsl bash -c "rsync -avz --delete --exclude 'appsettings.Production.json' '$publishPathUnix/' '$remote'"
} else {
    # scp: копирует всё (работает без WSL)
    Write-Host "      Используется scp (полная загрузка)" -ForegroundColor Gray
    Write-Host "      Подсказка: установите WSL для rsync — будет быстрее" -ForegroundColor Gray
    $tempRemote = "/tmp/myapp-publish-$(Get-Date -Format 'yyyyMMddHHmmss')"
    scp -r $publishPath "${USER}@${SERVER}:$tempRemote"
    $remotePublish = "$tempRemote/publish"
    ssh "${USER}@${SERVER}" "sudo cp -r $remotePublish/* $REMOTE_PATH/ && rm -rf $tempRemote"
}

if ($LASTEXITCODE -ne 0) { throw "Ошибка загрузки" }
Write-Host "      OK" -ForegroundColor Green

# --- 3. Перезапуск сервиса ---
if (-not $SkipRestart) {
    Write-Host "[4/4] Перезапуск myapp..." -ForegroundColor Yellow
    ssh "${USER}@${SERVER}" "sudo systemctl restart myapp"
    if ($LASTEXITCODE -ne 0) { throw "Ошибка перезапуска" }
    Write-Host "      OK" -ForegroundColor Green
} else {
    Write-Host "[4/4] Перезапуск пропущен (-SkipRestart)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Готово ===" -ForegroundColor Green
Write-Host "Сайт: https://learning.dvsmet.ru" -ForegroundColor Cyan

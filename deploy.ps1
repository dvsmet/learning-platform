# Deploy MyWebApi to server

param(
    [switch]$SkipBuild,
    [switch]$SkipRestart
)

$ErrorActionPreference = "Stop"

$SERVER = "95.182.121.83"
$USER = "deploy"
$REMOTE_PATH = "/var/www/myapp/publish"
$PROJECT_ROOT = $PSScriptRoot

Write-Host "=== MyWebApi Deploy ===" -ForegroundColor Cyan
Write-Host "Server: $USER@$SERVER" -ForegroundColor Gray
Write-Host ""

if (-not $SkipBuild) {
    $prevErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    Write-Host "[1/4] Building frontend..." -ForegroundColor Yellow
    Push-Location (Join-Path $PROJECT_ROOT "client-app")
    npm run build *> $null
    $feExit = $LASTEXITCODE
    Pop-Location
    if ($feExit -ne 0) { $ErrorActionPreference = $prevErrorAction; throw "Frontend build failed" }

    Write-Host "[2/4] Building backend..." -ForegroundColor Yellow
    Push-Location $PROJECT_ROOT
    dotnet publish MyWebApi.csproj -c Release -o ./publish *> $null
    $beExit = $LASTEXITCODE
    Pop-Location
    if ($beExit -ne 0) { $ErrorActionPreference = $prevErrorAction; throw "Backend build failed" }

    $ErrorActionPreference = $prevErrorAction
    Write-Host "      OK" -ForegroundColor Green
} else {
    Write-Host "[1-2/4] Build skipped (-SkipBuild)" -ForegroundColor Gray
}

Write-Host "[3/4] Uploading to server..." -ForegroundColor Yellow
$publishPath = Join-Path $PROJECT_ROOT "publish"

$useRsync = $false
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    $rsyncCheck = wsl which rsync 2>$null
    if ($LASTEXITCODE -eq 0) { $useRsync = $true }
}

if ($useRsync) {
    Write-Host "      Using rsync (incremental)" -ForegroundColor Gray
    $publishPathUnix = (wsl wslpath -a $publishPath).Trim().Replace("'", "'\''")
    $remote = "$USER@${SERVER}:$REMOTE_PATH/"
    wsl bash -c "rsync -avz --delete --exclude 'appsettings.Production.json' '$publishPathUnix/' '$remote'"
} else {
    Write-Host "      Using scp (direct to publish, deploy has chown)" -ForegroundColor Gray
    ssh "${USER}@${SERVER}" "cp $REMOTE_PATH/appsettings.Production.json /tmp/appsettings.Production.json.bak 2>/dev/null || true"
    $remoteParent = "/var/www/myapp"
    scp -r "$publishPath" "${USER}@${SERVER}:$remoteParent"
    if ($LASTEXITCODE -ne 0) { throw "scp failed - check connection" }
    ssh "${USER}@${SERVER}" "cp /tmp/appsettings.Production.json.bak $REMOTE_PATH/appsettings.Production.json 2>/dev/null || true"
}

if ($LASTEXITCODE -ne 0) { throw "Upload failed" }
Write-Host "      OK" -ForegroundColor Green

if (-not $SkipRestart) {
    Write-Host "[4/4] Restarting myapp..." -ForegroundColor Yellow
    ssh "${USER}@${SERVER}" "sudo systemctl restart myapp"
    if ($LASTEXITCODE -ne 0) { throw "Restart failed" }
    Write-Host "      OK" -ForegroundColor Green
} else {
    Write-Host "[4/4] Restart skipped (-SkipRestart)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Site: https://learning.dvsmet.ru" -ForegroundColor Cyan

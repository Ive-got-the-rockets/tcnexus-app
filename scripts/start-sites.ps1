# Starts the local TC Nexus backend and frontend, then opens both local sites.
# This launcher intentionally does not open VS Code.

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $repoRoot 'frontend'
$wordpressDev = Join-Path $repoRoot 'wordpress-dev'

Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$wordpressDev'; docker compose up -d"
) -WindowStyle Minimized

Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$frontend'; npm run mock-api"
) -WindowStyle Normal

Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$frontend'; npm start"
) -WindowStyle Normal

Start-Sleep -Seconds 6
Start-Process 'http://127.0.0.1:4200'
Start-Process 'http://localhost:8082/wp-admin/'

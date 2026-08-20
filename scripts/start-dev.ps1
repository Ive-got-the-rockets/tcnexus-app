# Starts the TC Nexus local dev environment: the WordPress dev stack (Docker),
# the mock API, the Angular dev server, and VS Code, then opens both the app
# and the WordPress admin in the default browser.
#
# The mock API stands in for the tcnexus-lms WordPress REST API until the
# frontend is pointed at the real WordPress instance below. Once
# frontend/src/environments/environment.ts targets it directly, this script's
# mock-api window is no longer needed.

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

$codeExe = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
if (-not (Test-Path $codeExe)) { $codeExe = 'code' }

$workspaceFile = Join-Path $repoRoot 'New TC Nexus Streaming Site - Custom Builded.code-workspace'
if (Test-Path $workspaceFile) {
  Start-Process $codeExe -ArgumentList @($workspaceFile)
} else {
  Start-Process $codeExe -ArgumentList @($repoRoot)
}

Start-Sleep -Seconds 6
Start-Process 'http://127.0.0.1:4200'
Start-Process 'http://localhost:8082/wp-admin/'

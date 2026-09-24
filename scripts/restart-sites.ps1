# Restarts only the TC Nexus local backend/frontend processes, then opens both sites.

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $repoRoot 'frontend'
$wordpressDev = Join-Path $repoRoot 'wordpress-dev'

# Stop the Angular process and the mock API process started by this project.
# The mock API's child command line does not retain the frontend working path,
# so its explicit script name is included as a safe, narrow match.
$projectFrontendPattern = [regex]::Escape($frontend)
$projectProcesses = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and
  (
    ($_.CommandLine -match $projectFrontendPattern -and $_.CommandLine -match 'ng\.js.*serve') -or
    ($_.CommandLine -match 'mock-api[\\/]server\.js') -or
    ($_.CommandLine -match 'npm-cli\.js.*run\s+mock-api')
  )
}

foreach ($process in $projectProcesses) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

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

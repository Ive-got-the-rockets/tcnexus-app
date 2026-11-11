$ErrorActionPreference = 'Stop'

$projectDirectory = Join-Path $PSScriptRoot 'frontend'
$mobileUrl = 'http://127.0.0.1:4200/mobile-layout-1'

function Test-MobileSite {
  try {
    $response = Invoke-WebRequest -Uri $mobileUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  }
  catch {
    return $false
  }
}

if (-not (Test-MobileSite)) {
  Start-Process -FilePath 'npm.cmd' -ArgumentList 'start' -WorkingDirectory $projectDirectory -WindowStyle Hidden

  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    Start-Sleep -Milliseconds 500
    if (Test-MobileSite) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
      'The TC Nexus mobile app did not start. Please check that Node.js and the project dependencies are installed.',
      'TC Nexus Mobile'
    ) | Out-Null
    exit 1
  }
}

Start-Process $mobileUrl

param([switch]$Fast)

$ErrorActionPreference = "Stop"

function Fail($msg) {
  Write-Host "`n[ERROR] $msg" -ForegroundColor Red
  exit 1
}

$root = "C:\Users\desmo\OneDrive\AI Programs\ArcanoDesk"
if (-not (Test-Path $root)) { Fail "Project root not found: $root" }
Set-Location $root

try { npm -v | Out-Null } catch { Fail "npm not found in PATH. Install Node.js or open a shell where npm is available." }

# Helper: does a script exist in package.json?
function HasScript($name) {
  try {
    $scripts = (Get-Content package.json -Raw | ConvertFrom-Json).scripts.PSObject.Properties.Name
    return $scripts -contains $name
  } catch {
    return $false
  }
}

$useFast = $Fast.IsPresent -and (HasScript "dev:fast")

if ($useFast) {
  Write-Host "`n🚀 Starting Arcano Desk (FAST mode)..." -ForegroundColor Cyan
  npm run dev:fast
} else {
  if ($Fast.IsPresent -and -not (HasScript "dev:fast")) {
    Write-Host "dev:fast not found, falling back to dev..." -ForegroundColor Yellow
  }
  Write-Host "`n🚀 Starting Arcano Desk..." -ForegroundColor Cyan
  npm run dev
}

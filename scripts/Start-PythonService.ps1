param(
  [int] $Port = 5112,
  [switch] $Fast
)

$ErrorActionPreference = "Stop"

# Project root is the parent of this scripts directory
$Root   = Split-Path -Parent $PSScriptRoot
$PyDir  = Join-Path $Root "python"
$Venv   = Join-Path $PyDir ".venv"

$PythonExe = ""
try { & py -3 --version | Out-Null; $PythonExe = "py -3" } catch { }
if(-not $PythonExe){ try { & python --version | Out-Null; $PythonExe = "python" } catch { } }
if(-not $PythonExe){ throw "Python not found. Install Python 3.x." }

if(-not (Test-Path $Venv)){
  Write-Host "Creating virtual environment..."
  & $PythonExe -m venv $Venv
}

$VenvPy = Join-Path $Venv "Scripts\python.exe"
$Req    = Join-Path $PyDir "requirements.txt"
if(-not (Test-Path $Req)){ throw "requirements.txt not found: $Req" }

Write-Host "Installing Python requirements..."
& $VenvPy -m pip install --upgrade pip | Out-Null
& $VenvPy -m pip install -r $Req | Out-Null

Write-Host "Starting FastAPI on port $Port..."
$env:ARCANO_PY_PORT = "$Port"
$env:OLLAMA_URL     = "http://127.0.0.1:11434"
$env:OLLAMA_MODEL   = "llama3.1"

# IMPORTANT: run uvicorn from the python dir so module 'app' is importable
Push-Location $PyDir
try {
  if ($Fast) {
    & $VenvPy -m uvicorn app:app --host 127.0.0.1 --port $Port
  } else {
    & $VenvPy -m uvicorn app:app --host 127.0.0.1 --port $Port --reload
  }
} finally {
  Pop-Location
}

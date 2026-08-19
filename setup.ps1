# setup.ps1
# Installs missing project dependencies.
# Assumes Node.js (and its bundled npm) are already installed.
$ErrorActionPreference = "Stop"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "ERROR: Node.js is not installed or not on PATH." -ForegroundColor Red
    Write-Host "Install Node.js from https://nodejs.org and try again." -ForegroundColor Yellow
    exit 1
}

$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
    Write-Host "ERROR: npm is not installed or not on PATH." -ForegroundColor Red
    Write-Host "npm ships with Node.js; your Node.js installation may be incomplete." -ForegroundColor Yellow
    exit 1
}

Write-Host "Using Node.js: $(node --version)" -ForegroundColor Cyan
Write-Host "Using npm:     $(npm --version)" -ForegroundColor Cyan

Write-Host "Installing missing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: 'npm install' failed." -ForegroundColor Red
    exit 1
}

Write-Host "Done. All dependencies are installed." -ForegroundColor Green
Write-Host "Run .\run.ps1 to build and start a working copy of SnippetVault." -ForegroundColor Green

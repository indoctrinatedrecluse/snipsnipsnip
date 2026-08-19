# run.ps1
# Builds and runs a working copy of SnippetVault.
$ErrorActionPreference = "Stop"

if (-not (Test-Path "node_modules")) {
    Write-Host "Dependencies not found. Running .\setup.ps1 first..." -ForegroundColor Yellow
    & .\setup.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: .\setup.ps1 failed." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Building SnippetVault..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed. See output above." -ForegroundColor Red
    exit 1
}

Write-Host "Starting a working copy of SnippetVault..." -ForegroundColor Cyan
Write-Host "Open http://localhost:4173 in your browser. Press Ctrl+C to stop." -ForegroundColor Green
npm run preview

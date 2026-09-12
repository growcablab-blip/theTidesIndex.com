# The Tides Index — Windows launcher
#
# Double-click this file, or right-click and choose "Run with PowerShell".
# From a terminal:  .\scripts\start-tides.ps1
#
# It installs dependencies on a first run, then hands over to `npm run tides`,
# which starts the database and the site and prints the pages to open.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host ''
Write-Host '  The Tides Index' -ForegroundColor White
Write-Host "  $root" -ForegroundColor DarkGray
Write-Host ''

# --- Node ------------------------------------------------------------------
$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $node) {
    Write-Host '  Node.js is not installed.' -ForegroundColor Yellow
    Write-Host '  Install the LTS build from https://nodejs.org and run this again.'
    Write-Host ''
    Read-Host '  Press Enter to close'
    exit 1
}

$version = (node --version)
Write-Host "  Node $version" -ForegroundColor DarkGray

# --- Dependencies ----------------------------------------------------------
if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    Write-Host '  Installing dependencies. This happens once and takes a few minutes.'
    Write-Host ''
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host '  Install failed. The output above says why.' -ForegroundColor Yellow
        Read-Host '  Press Enter to close'
        exit 1
    }
}

# --- Start -----------------------------------------------------------------
# `npm run tides` prints its own progress and the list of pages, and stays in
# the foreground until Ctrl+C. Nothing is published by running it.
npm run tides

Write-Host ''
Write-Host '  Stopped.' -ForegroundColor DarkGray
Write-Host ''
Read-Host '  Press Enter to close'

param(
    [string]$Root = "C:\The Tides Index"
)

$ErrorActionPreference = "Stop"

Write-Host "Preparing The Tides Index project at: $Root"

$folders = @(
    "docs",
    "schemas",
    "data\seed",
    "data\import",
    "content\book-1-understanding-peptides",
    "content\book-2-science-applications",
    "content\book-3-quality",
    "content\book-4-reference",
    "content\book-5-protocols",
    "sources\academic",
    "sources\practitioner",
    "sources\quality-manufacturing",
    "sources\primary-literature",
    "sources\regulatory",
    "sources\tremblay-archive",
    "assets\illustrations",
    "assets\diagrams",
    "assets\coa-examples",
    "assets\icons",
    "publishing\patient-handouts",
    "publishing\practitioner-guides",
    "publishing\quick-reference",
    "publishing\pdf",
    "scripts",
    "supabase\migrations",
    "app"
)

New-Item -ItemType Directory -Force -Path $Root | Out-Null
foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Root $folder) | Out-Null
}

if (-not (Test-Path (Join-Path $Root ".git"))) {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        git -C $Root init | Out-Null
        Write-Host "Initialized git repository."
    } else {
        Write-Warning "Git is not installed or not on PATH."
    }
}

Write-Host "Folder structure ready."
Write-Host "Copy the handoff package contents into $Root, then place source PDFs under sources\."
Write-Host "Open Claude Code at the project root and give it docs\CLAUDE_CODE_MASTER_HANDOFF_PROMPT.md."

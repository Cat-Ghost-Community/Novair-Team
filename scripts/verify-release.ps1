param(
  [switch]$Browser,
  [switch]$BrowserTools,
  [ValidatePattern('^test-results/[a-zA-Z0-9_-]+$')][string]$ArtifactDirectory
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (-not $ArtifactDirectory) { $ArtifactDirectory = 'test-results/prompt10-run-' + (Get-Date -Format 'yyyyMMddHHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8) }
if (Test-Path -LiteralPath $ArtifactDirectory) { throw 'Release evidence directory already exists; choose a new directory. No historical artifacts were overwritten.' }
& (Join-Path $PSScriptRoot 'verify-content.ps1') -Release -Browser:$Browser -BrowserTools:$BrowserTools -ArtifactDirectory $ArtifactDirectory
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

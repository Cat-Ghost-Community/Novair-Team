param([switch]$PlanOnly, [switch]$SkipOptionalTools)
$ErrorActionPreference = 'Stop'
$workspacePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$manifestPath = Join-Path $workspacePath 'package.json'
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
if ($manifest.name -ne 'novair') { throw 'Run this script from the existing NovAir repository.' }
$authVersion = '1.7.12'
$packageNames = @('better-auth', '@better-auth/prisma-adapter')
foreach ($packageName in $packageNames) {
  $existing = $manifest.dependencies.PSObject.Properties[$packageName]
  if ($existing -and $existing.Value -ne $authVersion) { throw 'An authentication version already exists. Review it instead of silently replacing it.' }
  $manifest.dependencies | Add-Member -NotePropertyName $packageName -NotePropertyValue $authVersion -Force
}
if ($SkipOptionalTools) {
  foreach ($toolName in @('prettier', 'vitest')) { $manifest.devDependencies.PSObject.Properties.Remove($toolName) }
}
if ($PlanOnly) {
  [pscustomobject]@{
    Mode = 'PlanOnly'; Packages = $packageNames; Version = $authVersion
    Registry = 'https://registry.npmjs.org/'; WorkingTreeChanged = $false
    LifecycleScripts = 'Skipped until reviewed'; AuthEndpointsEnabled = $false
    OptionalToolsSkipped = [bool]$SkipOptionalTools
  } | ConvertTo-Json
  exit 0
}

# Run by the user in normal PowerShell with approved registry access. Never alter proxy policy.
# A fresh child directory prevents npm reification/cleanup from damaging working dependencies.
$stagePath = Join-Path $workspacePath ('.local-tools\auth-dependencies-' + [Guid]::NewGuid().ToString('N'))
$cachePath = Join-Path $workspacePath '.npm-cache'
New-Item -ItemType Directory -Path $stagePath -Force | Out-Null
$encoding = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $stagePath 'package.json'), ($manifest | ConvertTo-Json -Depth 100), $encoding)
Write-Output "Installing reviewed packages in isolated directory: $stagePath"
Push-Location $workspacePath
try {
  & npm.cmd install --prefix $stagePath --cache $cachePath --registry=https://registry.npmjs.org/ --offline=false --fetch-retries=0 --ignore-scripts --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'Staged installation failed. Working dependencies are unchanged. Do not retry until the reported cause changes.' }
  & npm.cmd ls --prefix $stagePath --depth=0
  if ($LASTEXITCODE -ne 0) { throw 'Staged dependency inventory is invalid; working dependencies were not replaced.' }
  foreach ($packageName in $packageNames) {
    $installedPath = Join-Path $stagePath ('node_modules\' + $packageName + '\package.json')
    $installed = Get-Content -Raw -LiteralPath $installedPath | ConvertFrom-Json
    if ($installed.name -ne $packageName -or $installed.version -ne $authVersion) { throw 'Installed auth package does not match the reviewed exact version.' }
  }
  if (-not (Test-Path -LiteralPath (Join-Path $stagePath 'package-lock.json'))) { throw 'Staged installation did not produce a lockfile.' }
  $receipt = [pscustomobject]@{
    StagePath = $stagePath; Version = $authVersion; Packages = $packageNames
    CreatedUtc = [DateTime]::UtcNow.ToString('o'); State = 'InstalledInStaging_NotActivated'
    LifecycleScriptsRun = $false; CleanInstallVerified = $false; SecurityAuditVerified = $false
    OptionalToolsSkipped = [bool]$SkipOptionalTools
  }
  [IO.File]::WriteAllText((Join-Path $workspacePath '.local-tools\auth-dependencies-ready.json'), ($receipt | ConvertTo-Json), $encoding)
  Write-Output 'Staged dependencies are available for local review. Working manifest, node_modules, database, migrations and test artifacts are unchanged.'
  Write-Output 'Return to the agent to review installed types, the adapter and dependency audit before activation. This is not completed authentication or a release certification.'
} finally { Pop-Location }

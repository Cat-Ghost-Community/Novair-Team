param(
  [switch]$Browser,
  [switch]$BrowserOnly,
  [switch]$ContentOnly,
  [switch]$Release,
  [switch]$BrowserTools,
  [switch]$PreparedOwnedFixture,
  [ValidatePattern('^test-results/[a-zA-Z0-9_-]+$')][string]$ArtifactDirectory = 'test-results/prompt09'
)
$ErrorActionPreference = 'Stop'
if ($Browser -and $BrowserTools) { throw 'Choose the CDP runner or the approved browser-tool inspection, not both.' }
if ($BrowserOnly -and -not $Browser) { throw 'Browser-only verification requires -Browser.' }
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$node = (Get-Command node -CommandType Application).Source
if (-not (Test-Path -LiteralPath '.next/BUILD_ID')) { throw 'Build the application first: npm run build:local' }
if ((Test-Path -LiteralPath '.local-tools/auth-test-context.json') -and -not $PreparedOwnedFixture) { throw 'An owned test context already exists. Finish or investigate it before creating another.' }
if (netstat -ano -p tcp | Select-String ':3100\s+.*LISTENING') { throw 'Port 3100 must be unused; no existing process will be stopped.' }
New-Item -ItemType Directory -Force -Path $ArtifactDirectory | Out-Null
$server = $null
$prepared = $false
function Invoke-CheckedNode([string[]]$NodeArguments, [string]$LogName) {
  $previousPreference = $ErrorActionPreference
  try {
    # Windows PowerShell represents native stderr as ErrorRecord, including expected sanitized warnings.
    $ErrorActionPreference = 'Continue'
    & $node @NodeArguments *> "$ArtifactDirectory/$LogName"
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $previousPreference }
  if ($code -ne 0) { throw "Verification failed. Review $ArtifactDirectory/$LogName" }
  Write-Output "PASS: $LogName"
}
try {
  if ($PreparedOwnedFixture) {
    Invoke-CheckedNode @('--env-file=.env', 'scripts/auth-test-database.mjs', 'verify') 'database-resume-verification.log'
  } else { Invoke-CheckedNode @('--env-file=.env', 'scripts/auth-test-database.mjs', 'prepare') 'database-prepare.log' }
  $prepared = $true
  $env:NOVAIR_TEST_OUTPUT = $ArtifactDirectory
  $fixture = @('--env-file=.env', '--env-file=.local-tools/auth-test.env')
  Invoke-CheckedNode ($fixture + @('scripts/bootstrap-admin.ts')) 'bootstrap-create.log'
  Invoke-CheckedNode ($fixture + @('scripts/bootstrap-admin.ts')) 'bootstrap-repeat.log'
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $node
  $startInfo.WorkingDirectory = (Get-Location).Path
  $startInfo.Arguments = '--env-file=.env --env-file=.local-tools/auth-test.env node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100'
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $server = [System.Diagnostics.Process]::Start($startInfo)
  $stdout = $server.StandardOutput.ReadToEndAsync()
  $stderr = $server.StandardError.ReadToEndAsync()
  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if ($server.HasExited) { throw 'Owned test server exited before readiness.' }
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3100/login' -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 250 }
  }
  if (-not $ready) { throw 'Owned test server did not become ready.' }
  if (-not $BrowserOnly) {
    if (-not $ContentOnly) {
      Invoke-CheckedNode ($fixture + @('--conditions=react-server', '--test', '--test-isolation=none', 'tests/integration/auth.node.test.mjs')) 'security-http.tap'
      Invoke-CheckedNode ($fixture + @('--test', '--test-isolation=none', 'tests/http/foundation.test.mjs', 'tests/http/auth-closed.test.mjs')) 'http-regression.tap'
      Invoke-CheckedNode ($fixture + @('--conditions=react-server', '--test', '--test-isolation=none', 'tests/integration/requests.node.test.mjs')) 'requests-integration.tap'
      Invoke-CheckedNode ($fixture + @('--conditions=react-server', '--test', '--test-isolation=none', 'tests/integration/management.node.test.mjs')) 'management-integration.tap'
      Invoke-CheckedNode ($fixture + @('--conditions=react-server', '--test', '--test-isolation=none', 'tests/integration/customer-projects.node.test.mjs')) 'customer-projects-integration.tap'
      Invoke-CheckedNode ($fixture + @('--conditions=react-server', '--test', '--test-isolation=none', 'tests/integration/support.node.test.mjs')) 'support-integration.tap'
    }
    Invoke-CheckedNode ($fixture + @('--conditions=react-server', '--test', '--test-isolation=none', 'tests/integration/content.node.test.mjs')) 'content-integration.tap'
    if ($Release) { Invoke-CheckedNode ($fixture + @('--conditions=react-server', '--test', '--test-isolation=none', 'tests/integration/release.node.test.mjs')) 'release-integration.tap' }
  }
  if ($BrowserTools) {
    # Keep only this owned fixture alive for the separately authorized Chrome MCP tools.
    # The signal ends inspection; it does not certify any browser test as passed.
    $context = Get-Content -LiteralPath '.local-tools/auth-test-context.json' -Raw | ConvertFrom-Json
    $signal = ".local-tools/browser-tools-$($context.name).done"
    if (Test-Path -LiteralPath $signal) { throw 'An inspection signal already exists; refusing stale evidence.' }
    Write-Output "READY: owned browser-tool fixture at http://127.0.0.1:3100. Signal file: $signal"
    $deadline = (Get-Date).AddMinutes(45)
    while (-not (Test-Path -LiteralPath $signal)) {
      if ($server.HasExited -or (Get-Date) -gt $deadline) { throw 'Owned browser-tool inspection ended before its completion signal.' }
      Start-Sleep -Milliseconds 250
    }
    Remove-Item -LiteralPath $signal
    Write-Output 'Browser-tool inspection finished; consult its separate actual evidence, not a CDP-runner pass.'
  }
  if ($Browser) {
    if (-not $ContentOnly) {
      Invoke-CheckedNode ($fixture + @('--test', '--test-isolation=none', 'tests/cdp/foundation.test.mjs')) 'browser-regression.tap'
      Invoke-CheckedNode ($fixture + @('--test', '--test-isolation=none', 'tests/cdp/auth.test.mjs')) 'browser-auth.tap'
    }
    if (-not $ContentOnly) { Invoke-CheckedNode ($fixture + @('--test', '--test-isolation=none', 'tests/cdp/requests.test.mjs')) 'browser-requests.tap' }
    if (-not $ContentOnly) { Invoke-CheckedNode ($fixture + @('--test', '--test-isolation=none', 'tests/cdp/management.test.mjs')) 'browser-management.tap' }
    Invoke-CheckedNode ($fixture + @('--test', '--test-isolation=none', 'tests/cdp/customer-projects.test.mjs')) 'browser-customer-projects.tap'
  }
} finally {
  if ($null -ne $server) {
    if (-not $server.HasExited) { $server.Kill(); $server.WaitForExit() }
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) "$ArtifactDirectory/server-stdout.log"), $stdout.GetAwaiter().GetResult())
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) "$ArtifactDirectory/server-stderr.log"), $stderr.GetAwaiter().GetResult())
    $server.Dispose()
  }
  if ($prepared) { Invoke-CheckedNode @('--env-file=.env', 'scripts/auth-test-database.mjs', 'cleanup') 'database-cleanup.log' }
}

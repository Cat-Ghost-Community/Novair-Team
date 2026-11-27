param([switch]$Browser, [switch]$RequestsOnly)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$node = (Get-Command node -CommandType Application).Source
if (-not (Test-Path -LiteralPath '.next/BUILD_ID')) { throw 'Build the application first: npm run build:local' }
if (Test-Path -LiteralPath '.local-tools/auth-test-context.json') { throw 'An owned test context already exists. Finish or investigate it before creating another.' }
if (netstat -ano -p tcp | Select-String ':3100\s+.*LISTENING') { throw 'Port 3100 must be unused; no existing process will be stopped.' }
New-Item -ItemType Directory -Force -Path 'test-results/prompt05' | Out-Null
$server = $null
$prepared = $false
function Invoke-CheckedNode([string[]]$NodeArguments, [string]$LogName) {
  $previousPreference = $ErrorActionPreference
  try {
    # Windows PowerShell represents native stderr as ErrorRecord, including expected sanitized warnings.
    $ErrorActionPreference = 'Continue'
    & $node @NodeArguments *> "test-results/prompt05/$LogName"
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $previousPreference }
  if ($code -ne 0) { throw "Verification failed. Review test-results/prompt05/$LogName" }
  Write-Output "PASS: $LogName"
}
try {
  Invoke-CheckedNode @('--env-file=.env', 'scripts/auth-test-database.mjs', 'prepare') 'database-prepare.log'
  $prepared = $true
  $env:NOVAIR_TEST_OUTPUT = 'test-results/prompt05'
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
  if (-not $RequestsOnly) {
    Invoke-CheckedNode ($fixture + @('--conditions=react-server', '--test', '--test-isolation=none', 'tests/integration/auth.node.test.mjs')) 'security-http.tap'
    Invoke-CheckedNode ($fixture + @('--test', '--test-isolation=none', 'tests/http/foundation.test.mjs', 'tests/http/auth-closed.test.mjs')) 'http-regression.tap'
  }
  Invoke-CheckedNode ($fixture + @('--conditions=react-server', '--test', '--test-isolation=none', 'tests/integration/requests.node.test.mjs')) 'requests-integration.tap'
  if ($Browser) {
    if (-not $RequestsOnly) {
      Invoke-CheckedNode ($fixture + @('--test', '--test-isolation=none', 'tests/cdp/foundation.test.mjs')) 'browser-regression.tap'
      Invoke-CheckedNode ($fixture + @('--test', '--test-isolation=none', 'tests/cdp/auth.test.mjs')) 'browser-auth.tap'
    }
    Invoke-CheckedNode ($fixture + @('--test', '--test-isolation=none', 'tests/cdp/requests.test.mjs')) 'browser-requests.tap'
  }
} finally {
  if ($null -ne $server) {
    if (-not $server.HasExited) { $server.Kill(); $server.WaitForExit() }
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) 'test-results/prompt05/server-stdout.log'), $stdout.GetAwaiter().GetResult())
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) 'test-results/prompt05/server-stderr.log'), $stderr.GetAwaiter().GetResult())
    $server.Dispose()
  }
  if ($prepared) { Invoke-CheckedNode @('--env-file=.env', 'scripts/auth-test-database.mjs', 'cleanup') 'database-cleanup.log' }
}

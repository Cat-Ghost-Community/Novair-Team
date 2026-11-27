param([ValidateRange(3200,3299)][int]$Port = 3200)
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $workspace
if (netstat -ano -p tcp | Select-String ":$Port\s+.*LISTENING") { throw 'Qualification port is occupied; no existing server will be stopped.' }
$candidate = Join-Path $workspace ('.local-tools\release-install-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $candidate | Out-Null
# Never promote a test tree or replace the working node_modules. Keep failed evidence for diagnosis.
foreach ($directory in @('src','public','prisma','scripts')) { Copy-Item -LiteralPath (Join-Path $workspace $directory) -Destination $candidate -Recurse }
foreach ($name in @('package.json','package-lock.json','next.config.ts','tsconfig.json','postcss.config.mjs','eslint.config.mjs','next-env.d.ts')) { Copy-Item -LiteralPath (Join-Path $workspace $name) -Destination $candidate }
$node = (Get-Command node -CommandType Application).Source
$npm = Join-Path (Split-Path (Get-Command npm -CommandType Application).Source) 'node_modules\npm\bin\npm-cli.js'
if (-not (Test-Path -LiteralPath $npm)) { throw 'Cannot locate the installed npm CLI; supply a normal Node/npm installation.' }
$server = $null
try {
  Set-Location -LiteralPath $candidate
  & $node $npm audit --offline=false --registry=https://registry.npmjs.org --fetch-retries=0 --fetch-timeout=15000 --json *> advisory.json
  $advisoryCode = $LASTEXITCODE
  if ($advisoryCode -ne 0) { throw 'Fresh dependency audit needs review; no automatic update or policy bypass performed.' }
  & $node $npm ci --offline=false --registry=https://registry.npmjs.org --fetch-retries=0 --fetch-timeout=30000 --no-audit --no-fund *> install.log
  if ($LASTEXITCODE -ne 0) { throw 'Normal lifecycle installation failed. Review install.log; working dependencies are untouched.' }
  & $node '--env-file=../../.env' node_modules/prisma/build/index.js generate *> prisma-generate.log
  if ($LASTEXITCODE -ne 0) { throw 'Prisma generation failed.' }
  # Build on this normal operator host; no subprocess/security restrictions are changed.
  & $node '--env-file=../../.env' node_modules/next/dist/bin/next build --webpack *> build.log
  if ($LASTEXITCODE -ne 0) { throw 'Candidate production build failed.' }
  $info = [Diagnostics.ProcessStartInfo]::new()
  $info.FileName = $node
  $info.Arguments = "--env-file=../../.env node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port $Port"
  $info.WorkingDirectory = $candidate
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  $info.EnvironmentVariables['SITE_URL'] = "http://127.0.0.1:$Port"
  $server = [Diagnostics.Process]::Start($info)
  $out = $server.StandardOutput.ReadToEndAsync()
  $err = $server.StandardError.ReadToEndAsync()
  $ready = $false
  for ($attempt=0; $attempt -lt 40; $attempt++) {
    if ($server.HasExited) { throw 'Candidate server exited.' }
    try { $response = Invoke-WebRequest "http://127.0.0.1:$Port/login" -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { $ready=$true; break } } catch { Start-Sleep -Milliseconds 250 }
  }
  if (-not $ready) { throw 'Candidate readiness timed out.' }
  foreach ($path in @('/','/login','/register','/api/auth/get-session')) { if ((Invoke-WebRequest "http://127.0.0.1:$Port$path" -UseBasicParsing).StatusCode -ne 200) { throw 'Candidate runtime smoke failed.' } }
  Write-Output "PASS: fresh audit, exact-lock normal install, generation, production build and isolated runtime smoke. Evidence retained in $candidate. This is not production-host qualification."
} finally {
  if ($null -ne $server) {
    if (-not $server.HasExited) { $server.Kill(); $server.WaitForExit() }
    [IO.File]::WriteAllText((Join-Path $candidate 'server.log'), $out.GetAwaiter().GetResult())
    [IO.File]::WriteAllText((Join-Path $candidate 'server-error.log'), $err.GetAwaiter().GetResult())
    $server.Dispose()
  }
  Set-Location -LiteralPath $workspace
}

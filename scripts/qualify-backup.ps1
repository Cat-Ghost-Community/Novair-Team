param([switch]$ResumeOwnedRestore, [switch]$VerifyRestored)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (netstat -ano -p tcp | Select-String ':3101\s+.*LISTENING') { throw 'Port 3101 is occupied; no process will be stopped.' }
$node = (Get-Command node -CommandType Application).Source
$directory = Join-Path (Get-Location) '.local-tools/release-backup'
$dumpBinary = Get-ChildItem -Path "$env:ProgramFiles\MySQL\MySQL Server *\bin\mysqldump.exe" | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
if (-not $dumpBinary) { throw 'Matching native MySQL client tools are required.' }
$clientBinary = Join-Path (Split-Path $dumpBinary) 'mysql.exe'
$settings = @{}
Get-Content -LiteralPath '.local-tools/auth-test.env' | ForEach-Object { if ($_ -match '^([A-Z_]+)=(.*)$') { $settings[$matches[1]] = $matches[2] } }
$sourceUrl = [Uri]$settings['DATABASE_URL']
if ($sourceUrl.Host -notin @('127.0.0.1','localhost') -or $sourceUrl.AbsolutePath -notmatch '^/novair_auth_test_[a-f0-9]{12}$') { throw 'Only an existing owned local verification fixture is accepted.' }
$credentials = $sourceUrl.UserInfo.Split(':',2)
function Node-Step([string]$Action) {
  & $node --env-file=.env --env-file=.local-tools/auth-test.env scripts/qualify-backup.mjs $Action
  if ($LASTEXITCODE -ne 0) { throw "Backup qualification step failed: $Action. Retain private artifacts for investigation." }
}
function Mysql-Info([string]$Binary) {
  $p = [Diagnostics.ProcessStartInfo]::new(); $p.FileName=$Binary; $p.UseShellExecute=$false; $p.CreateNoWindow=$true
  $p.RedirectStandardOutput=$true; $p.RedirectStandardError=$true
  $p.EnvironmentVariables['MYSQL_PWD']=[Uri]::UnescapeDataString($credentials[1])
  return $p
}
$server=$null
if (-not $ResumeOwnedRestore -and -not $VerifyRestored) { Node-Step 'prepare' }
try {
  if (-not $VerifyRestored) {
  if (-not $ResumeOwnedRestore) {
  $dump = Mysql-Info $dumpBinary
  $dump.Arguments = "--no-defaults --protocol=TCP --host=127.0.0.1 --port=$($sourceUrl.Port) --user=$([Uri]::UnescapeDataString($credentials[0])) --single-transaction --quick --hex-blob --no-tablespaces --set-gtid-purged=OFF --column-statistics=0 --default-character-set=utf8mb4 --result-file=`"$directory/dump.sql`" $($sourceUrl.AbsolutePath.TrimStart('/'))"
  $p=[Diagnostics.Process]::Start($dump); $dumpOut=$p.StandardOutput.ReadToEndAsync(); $dumpError=$p.StandardError.ReadToEndAsync(); $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw 'Consistent mysqldump failed; private diagnostic retained only in process memory.' }; $p.Dispose()
  Node-Step 'encrypt'; Node-Step 'decrypt'
  }
  $context=Get-Content -LiteralPath "$directory/context.json" -Raw | ConvertFrom-Json
  if ($context.name -notmatch '^novair_restore_test_[a-f0-9]{12}$') { throw 'Invalid restore identity.' }
  $restore=Mysql-Info $clientBinary
  $restore.RedirectStandardInput=$true
  $restore.Arguments="--no-defaults --protocol=TCP --host=127.0.0.1 --port=$($sourceUrl.Port) --user=$([Uri]::UnescapeDataString($credentials[0])) --default-character-set=utf8mb4 $($context.name)"
  $p=[Diagnostics.Process]::Start($restore); $restoreOut=$p.StandardOutput.ReadToEndAsync(); $restoreError=$p.StandardError.ReadToEndAsync()
  try { $bytes=[IO.File]::ReadAllBytes("$directory/restore.sql"); $p.StandardInput.BaseStream.Write($bytes,0,$bytes.Length); $p.StandardInput.BaseStream.Flush(); $p.StandardInput.Close(); $p.WaitForExit(); if ($p.ExitCode -ne 0) { throw 'MySQL restoration failed.' } } finally { $p.Dispose(); Remove-Item -LiteralPath "$directory/restore.sql" }
  }
  Node-Step 'verify'
  $info=[Diagnostics.ProcessStartInfo]::new(); $info.FileName=$node; $info.WorkingDirectory=(Get-Location).Path
  $info.Arguments='--env-file=.env --env-file=.local-tools/auth-test.env --env-file=.local-tools/release-backup/restore.env node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3101'
  $info.UseShellExecute=$false; $info.CreateNoWindow=$true; $info.RedirectStandardOutput=$true; $info.RedirectStandardError=$true
  $server=[Diagnostics.Process]::Start($info); $out=$server.StandardOutput.ReadToEndAsync(); $err=$server.StandardError.ReadToEndAsync()
  $ready=$false
  for($attempt=0;$attempt -lt 40;$attempt++){ if($server.HasExited){throw 'Restored server exited.'};try{if((Invoke-WebRequest 'http://127.0.0.1:3101/login' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200){$ready=$true;break}}catch{Start-Sleep -Milliseconds 250} }
  if(-not $ready){throw 'Restored server readiness failed.'}
  & $node --env-file=.env --env-file=.local-tools/auth-test.env --env-file=.local-tools/release-backup/restore.env scripts/verify-restored-runtime.mjs
  if($LASTEXITCODE -ne 0){throw 'Restored runtime verification failed.'}
} finally {
  if($null -ne $server){if(-not $server.HasExited){$server.Kill();$server.WaitForExit()};$server.Dispose()}
}
Node-Step 'cleanup'
Write-Output 'PASS: actual native MySQL consistent backup, authenticated encryption, isolated restoration and production application login/business reads verified. No live data exported or reset.'

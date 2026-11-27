$ErrorActionPreference = 'Stop'
$workspacePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$databasePath = [IO.Path]::GetFullPath((Join-Path $workspacePath '.data\mysql'))
if (-not $databasePath.StartsWith($workspacePath + [IO.Path]::DirectorySeparatorChar)) { throw 'Invalid workspace data path.' }
if (-not (Test-Path -LiteralPath (Join-Path $workspacePath '.env'))) { throw 'Run node scripts/setup-local.mjs first.' }
$settings = @{}
Get-Content -LiteralPath (Join-Path $workspacePath '.env') | ForEach-Object {
  if ($_ -match '^([A-Z_]+)=(.*)$') { $settings[$matches[1]] = $matches[2] }
}
foreach ($key in @('MYSQL_USER','MYSQL_DATABASE','MYSQL_PASSWORD','MYSQL_ROOT_PASSWORD','MYSQL_PORT')) {
  if (-not $settings[$key] -or $settings[$key] -notmatch '^[A-Za-z0-9_]+$') { throw "Invalid $key; this helper accepts generated local credentials only." }
}
$mysqlCommand = Get-Command mysqld -ErrorAction SilentlyContinue
$serverBinary = if ($mysqlCommand) { $mysqlCommand.Source } else {
  Get-ChildItem -Path "$env:ProgramFiles\MySQL\MySQL Server *\bin\mysqld.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $serverBinary) { throw 'MySQL server not found. Install MySQL or use npm run db:up with Docker.' }
$clientBinary = Join-Path (Split-Path $serverBinary) 'mysql.exe'
New-Item -ItemType Directory -Force -Path $databasePath | Out-Null
$firstStart = -not (Test-Path -LiteralPath (Join-Path $databasePath 'mysql'))
$provisionedPath = Join-Path $databasePath '.novair-provisioned'
if ($firstStart) {
  & $serverBinary --no-defaults --initialize-insecure "--datadir=$databasePath" --console
  if ($LASTEXITCODE -ne 0) { throw 'Local MySQL initialization failed.' }
}
$configPath = Join-Path $workspacePath '.data\mysql-local.ini'
@"
[mysqld]
datadir=$($databasePath.Replace('\','/'))
port=$($settings.MYSQL_PORT)
bind-address=127.0.0.1
mysqlx=0
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
log-error=$($databasePath.Replace('\','/'))/server-error.log
pid-file=$($databasePath.Replace('\','/'))/server.pid
"@ | Set-Content -LiteralPath $configPath -Encoding ASCII
$probe = New-Object Net.Sockets.TcpClient
try { $probe.Connect('127.0.0.1', [int]$settings.MYSQL_PORT); $listening = $true } catch { $listening = $false } finally { $probe.Dispose() }
if (-not $listening) {
  Start-Process -FilePath $serverBinary -ArgumentList "--defaults-file=`"$configPath`"" -WindowStyle Hidden
}
$previousPassword = $env:MYSQL_PWD
try {
  $env:MYSQL_PWD = if (Test-Path -LiteralPath $provisionedPath) { $settings.MYSQL_ROOT_PASSWORD } else { '' }
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    $ErrorActionPreference = 'Continue'
    'SELECT 1;' | & $clientBinary --no-defaults --protocol=TCP --host=127.0.0.1 "--port=$($settings.MYSQL_PORT)" --user=root --silent 2>$null | Out-Null
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Local MySQL did not become ready; inspect .data/mysql/server-error.log.' }
  $activeDataPath = ('SELECT @@datadir;' | & $clientBinary --no-defaults --protocol=TCP --host=127.0.0.1 "--port=$($settings.MYSQL_PORT)" --user=root --silent --raw --skip-column-names).Trim().Replace('/', '\').TrimEnd('\')
  if ($activeDataPath -ne $databasePath.TrimEnd('\')) { throw 'The port belongs to another MySQL data directory; no accounts were modified.' }
  $sql = @"
ALTER USER 'root'@'localhost' IDENTIFIED BY '$($settings.MYSQL_ROOT_PASSWORD)';
CREATE DATABASE IF NOT EXISTS $($settings.MYSQL_DATABASE) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$($settings.MYSQL_USER)'@'localhost' IDENTIFIED BY '$($settings.MYSQL_PASSWORD)';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON $($settings.MYSQL_DATABASE).* TO '$($settings.MYSQL_USER)'@'localhost';
"@
  $sql | & $clientBinary --no-defaults --protocol=TCP --host=127.0.0.1 "--port=$($settings.MYSQL_PORT)" --user=root --silent
  if ($LASTEXITCODE -ne 0) { throw 'Creating the local database account failed.' }
  New-Item -ItemType File -Force -Path $provisionedPath | Out-Null
  Write-Output "Workspace MySQL is ready on 127.0.0.1:$($settings.MYSQL_PORT). No secrets printed."
} finally { $env:MYSQL_PWD = $previousPassword }

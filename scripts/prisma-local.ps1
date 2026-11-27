param(
  [ValidateSet('Validate','Generate','Migrate','Diff')][string]$Action = 'Migrate',
  [string]$MigrationName = '202610240001_foundation',
  [switch]$FromDatabase
)
$ErrorActionPreference = 'Stop'
$workspacePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$enginePath = Join-Path $workspacePath 'node_modules\@prisma\engines\schema-engine-windows.exe'
if (-not (Test-Path -LiteralPath $enginePath)) { throw 'Install matching Prisma dependencies first.' }
$previousDatabaseUrl = $env:DATABASE_URL
$previousSchemaEngine = $env:PRISMA_SCHEMA_ENGINE_BINARY
$previousQueryEngine = $env:PRISMA_QUERY_ENGINE_LIBRARY
$engineProcess = $null
try {
  Get-Content -LiteralPath (Join-Path $workspacePath '.env') | ForEach-Object {
    if ($_ -match '^DATABASE_URL=(.+)$') { $env:DATABASE_URL = $matches[1].Trim('"').Trim("'") }
  }
  $databaseUri = [Uri]$env:DATABASE_URL
  if ($databaseUri.Scheme -ne 'mysql' -or $databaseUri.Host -notin @('127.0.0.1','localhost','[::1]')) { throw 'A local MySQL URL is required.' }
  $env:PRISMA_SCHEMA_ENGINE_BINARY = $enginePath
  $env:PRISMA_QUERY_ENGINE_LIBRARY = Join-Path $workspacePath 'node_modules\@prisma\engines\query_engine-windows.dll.node'
  if ($Action -in @('Validate','Generate')) {
    & node (Join-Path $workspacePath 'node_modules\prisma\build\index.js') $Action.ToLowerInvariant()
    if ($LASTEXITCODE -ne 0) { throw "Prisma $Action failed." }
    exit 0
  }
  $schemaPath = Join-Path $workspacePath 'prisma\schema.prisma'
  $migrationsPath = Join-Path $workspacePath 'prisma\migrations'
  if ($Action -eq 'Diff') {
    if ($MigrationName -notmatch '^\d{12,14}_[a-z0-9_]+$') { throw 'Invalid migration name.' }
    $outputDirectory = Join-Path $migrationsPath $MigrationName
    $outputPath = Join-Path $outputDirectory 'migration.sql'
    if (Test-Path -LiteralPath $outputPath) { throw 'Migration already exists; it will not be overwritten.' }
    $method = 'diff'
    $parameters = @{
      from = $(if ($FromDatabase) { @{ tag = 'url'; url = $env:DATABASE_URL } } else { @{ tag = 'empty' } })
      to = @{ tag = 'schemaDatamodel'; files = @(@{ path = $schemaPath; content = [IO.File]::ReadAllText($schemaPath) }) }
      script = $true; shadowDatabaseUrl = $null; exitCode = $null
      filters = @{ externalTables = @(); externalEnums = @() }
    }
  } else {
    $directories = @(Get-ChildItem -LiteralPath $migrationsPath -Directory | Sort-Object Name | ForEach-Object {
      @{ path = $_.Name; migrationFile = @{ path = 'migration.sql'; content = @{ tag = 'ok'; value = [IO.File]::ReadAllText((Join-Path $_.FullName 'migration.sql')) } } }
    })
    $method = 'applyMigrations'
    $parameters = @{
      migrationsList = @{ baseDir = $migrationsPath; lockfile = @{ path = 'migration_lock.toml'; content = [IO.File]::ReadAllText((Join-Path $migrationsPath 'migration_lock.toml')) }; migrationDirectories = $directories; shadowDbInitScript = '' }
      filters = @{ externalTables = @(); externalEnums = @() }
    }
  }
  # Use the actual installed Prisma engine protocol, without fabricating SQL or migration history.
  # This fallback is for Windows sandboxes that reject Node child_process.spawn of native binaries.
  $startInfo = New-Object Diagnostics.ProcessStartInfo
  $startInfo.FileName = $enginePath
  $startInfo.Arguments = "-d `"$schemaPath`""
  $startInfo.WorkingDirectory = $workspacePath
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.StandardOutputEncoding = New-Object Text.UTF8Encoding($false)
  $engineProcess = [Diagnostics.Process]::Start($startInfo)
  $stderrTask = $engineProcess.StandardError.ReadToEndAsync()
  $payload = @{ jsonrpc = '2.0'; id = 1; method = $method; params = $parameters } | ConvertTo-Json -Depth 30 -Compress
  $engineProcess.StandardInput.WriteLine($payload)
  $sql = New-Object Collections.Generic.List[string]
  while ($true) {
    $readTask = $engineProcess.StandardOutput.ReadLineAsync()
    if (-not $readTask.Wait(60000)) { throw 'The local Prisma engine response timed out.' }
    $line = $readTask.Result
    if ($null -eq $line) { throw 'Prisma engine exited without a response.' }
    $response = $line | ConvertFrom-Json
    if ($response.method -eq 'print') {
      $sql.Add([string]$response.params.content)
      if ($null -ne $response.id) { $engineProcess.StandardInput.WriteLine((@{ jsonrpc = '2.0'; id = $response.id; result = @{} } | ConvertTo-Json -Compress)) }
      continue
    }
    if ($response.id -eq 1) {
      if ($response.error) { throw 'Prisma engine rejected the operation. Inspect local schema, migrations and database readiness.' }
      if ($Action -eq 'Diff') {
        if ($sql.Count -eq 0) { throw 'Prisma returned no migration SQL.' }
        New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
        [IO.File]::WriteAllText($outputPath, ($sql -join "`n"), (New-Object Text.UTF8Encoding($false)))
        Write-Output 'Generated versioned SQL migration using the installed Prisma engine.'
      } else {
        Write-Output "Prisma applied migrations: $(@($response.result.appliedMigrationNames).Count)."
      }
      break
    }
  }
} finally {
  if ($engineProcess) {
    $engineProcess.StandardInput.Close()
    if (-not $engineProcess.WaitForExit(3000)) { $engineProcess.Kill() }
    $engineProcess.Dispose()
  }
  $env:DATABASE_URL = $previousDatabaseUrl
  $env:PRISMA_SCHEMA_ENGINE_BINARY = $previousSchemaEngine
  $env:PRISMA_QUERY_ENGINE_LIBRARY = $previousQueryEngine
}

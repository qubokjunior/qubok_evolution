param(
  [string]$ProjectPath = "I:\Art\_AI\app_development\simulation\evolution",
  [switch]$RunNpmChecks,
  [switch]$OpenReport
)

$ErrorActionPreference = "Stop"

function Write-Utf8NoBom {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Text
  )
  $FullPath = [System.IO.Path]::GetFullPath($Path)
  $Encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($FullPath, $Text, $Encoding)
}

function Get-RelativeProjectPath {
  param(
    [Parameter(Mandatory=$true)][string]$Root,
    [Parameter(Mandatory=$true)][string]$Path
  )
  $RootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\','/') + [System.IO.Path]::DirectorySeparatorChar
  $PathFull = [System.IO.Path]::GetFullPath($Path)
  if($PathFull.StartsWith($RootFull, [System.StringComparison]::OrdinalIgnoreCase)){
    return $PathFull.Substring($RootFull.Length).Replace('\','/')
  }
  return $PathFull
}

function Test-HasUtf8Bom {
  param([Parameter(Mandatory=$true)][string]$Path)
  if(!(Test-Path $Path)){ return $false }
  $Stream = [System.IO.File]::OpenRead((Resolve-Path $Path).Path)
  try {
    if($Stream.Length -lt 3){ return $false }
    $Bytes = New-Object byte[] 3
    [void]$Stream.Read($Bytes, 0, 3)
    return ($Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF)
  } finally {
    $Stream.Dispose()
  }
}

function Get-FileSha256Short {
  param([Parameter(Mandatory=$true)][string]$Path)
  if(!(Test-Path $Path)){ return "" }
  try {
    return ((Get-FileHash -Algorithm SHA256 -Path $Path).Hash.Substring(0, 12)).ToLowerInvariant()
  } catch {
    return "hash-error"
  }
}

function Read-TextSafe {
  param([Parameter(Mandatory=$true)][string]$Path)
  try {
    return [System.IO.File]::ReadAllText((Resolve-Path $Path).Path, [System.Text.Encoding]::UTF8)
  } catch {
    return ""
  }
}

function Add-Section {
  param(
    [Parameter(Mandatory=$true)][System.Text.StringBuilder]$Builder,
    [Parameter(Mandatory=$true)][string]$Title
  )
  [void]$Builder.AppendLine("")
  [void]$Builder.AppendLine("================================================================================")
  [void]$Builder.AppendLine($Title)
  [void]$Builder.AppendLine("================================================================================")
}

function Add-KeyValue {
  param(
    [Parameter(Mandatory=$true)][System.Text.StringBuilder]$Builder,
    [Parameter(Mandatory=$true)][string]$Key,
    [AllowNull()][object]$Value
  )
  [void]$Builder.AppendLine(("{0,-32} {1}" -f ($Key + ":"), $Value))
}

function Add-FileAuditTable {
  param(
    [Parameter(Mandatory=$true)][System.Text.StringBuilder]$Builder,
    [Parameter(Mandatory=$true)][string[]]$Files,
    [Parameter(Mandatory=$true)][string]$Root,
    [string]$Title = "File audit"
  )
  Add-Section $Builder $Title
  [void]$Builder.AppendLine(("status  {0,-70} {1,10}  {2,-12}  {3}" -f "path", "bytes", "sha256", "notes"))
  [void]$Builder.AppendLine(("------  {0,-70} {1,10}  {2,-12}  {3}" -f "----", "-----", "------", "-----"))

  foreach($Relative in $Files){
    $Full = Join-Path $Root $Relative
    if(Test-Path $Full){
      $Item = Get-Item $Full
      $BomNote = if(Test-HasUtf8Bom $Full){ "BOM" } else { "" }
      $Sha = Get-FileSha256Short $Full
      [void]$Builder.AppendLine(("ok      {0,-70} {1,10}  {2,-12}  {3}" -f $Relative, $Item.Length, $Sha, $BomNote))
    } else {
      [void]$Builder.AppendLine(("missing {0,-70} {1,10}  {2,-12}  {3}" -f $Relative, "-", "-", ""))
    }
  }
}

function Invoke-CapturedCommand {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$Command
  )
  $TempOut = Join-Path $env:TEMP ("qubok_evolve_audit_" + [guid]::NewGuid().ToString("N") + ".log")
  $Started = Get-Date
  $ExitCode = 0
  try {
    $Process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $Command) -NoNewWindow -Wait -PassThru -RedirectStandardOutput $TempOut -RedirectStandardError $TempOut
    $ExitCode = $Process.ExitCode
  } catch {
    $ExitCode = -1
    Set-Content -Path $TempOut -Value ("COMMAND LAUNCH ERROR: " + $_.Exception.Message) -Encoding UTF8
  }
  $Ended = Get-Date
  $Output = ""
  if(Test-Path $TempOut){
    $Output = Get-Content $TempOut -Raw
    Remove-Item -Force $TempOut -ErrorAction SilentlyContinue
  }
  return [pscustomobject]@{
    name = $Name
    command = $Command
    exitCode = $ExitCode
    started = $Started
    ended = $Ended
    ms = [math]::Round(($Ended - $Started).TotalMilliseconds, 2)
    output = $Output
  }
}

if(!(Test-Path $ProjectPath)){
  throw "Project path does not exist: $ProjectPath"
}

$ProjectPath = (Resolve-Path $ProjectPath).Path
Set-Location $ProjectPath

$ReportDir = Join-Path $ProjectPath "docs\_project_state"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportPath = Join-Path $ReportDir ("qubok_evolve_state_report_" + $Stamp + ".txt")
$JsonPath = Join-Path $ReportDir ("qubok_evolve_state_report_" + $Stamp + ".json")

$CoreFiles = @(
  "package.json",
  "index.html",
  "tsconfig.json",
  "vite.config.ts",
  "src/vite-env.d.ts",
  "src/main.ts",
  "src/styles.css",
  "src/ui/App.ts",
  "src/render/pixiRenderer.ts",
  "src/render/debugOverlay.ts",
  "src/shared/perfMetrics.ts"
)

$SimFiles = @(
  "src/sim/rng.ts",
  "src/sim/arrays.ts",
  "src/sim/world.ts",
  "src/sim/movement.ts",
  "src/sim/renderSnapshot.ts",
  "src/sim/demoSimulation.ts",
  "src/sim/spatialHash.ts",
  "src/sim/neighborQuery.ts",
  "src/sim/resources.ts",
  "src/sim/energy.ts",
  "src/sim/reproduction.ts",
  "src/sim/mutation.ts",
  "src/sim/predatorPrey.ts",
  "src/sim/sensors.ts"
)

$DocFiles = @(
  "docs/architecture.md",
  "docs/runtime_contract.md",
  "docs/component_model.md",
  "docs/compiler_spec.md",
  "docs/sensor_schema.md",
  "docs/terrain_fields.md",
  "docs/evolution_rules.md",
  "docs/perf_budget.md",
  "docs/replay_spec.md",
  "docs/prompt_contract.md",
  "docs/world_state.md",
  "docs/movement.md",
  "docs/render_snapshot.md",
  "docs/perf_metrics.md",
  "docs/spatial_hash.md",
  "docs/neighbor_query.md",
  "docs/resources.md",
  "docs/energy.md",
  "docs/reproduction.md",
  "docs/mutation.md",
  "docs/reproduction_mutation_integration.md",
  "docs/predator_prey.md",
  "docs/sensors.md"
)

$ScriptFiles = @(
  "scripts/check-boundaries.mjs",
  "scripts/bench-m1.mjs",
  "scripts/test-rng.mjs",
  "scripts/bench-rng.mjs",
  "scripts/test-world.mjs",
  "scripts/bench-world.mjs",
  "scripts/test-movement.mjs",
  "scripts/bench-movement.mjs",
  "scripts/test-render-snapshot.mjs",
  "scripts/bench-render-snapshot.mjs",
  "scripts/test-perf-metrics.mjs",
  "scripts/bench-perf-metrics.mjs",
  "scripts/test-spatial-hash.mjs",
  "scripts/bench-spatial-hash.mjs",
  "scripts/test-neighbor-query.mjs",
  "scripts/bench-neighbor-query.mjs",
  "scripts/test-resources.mjs",
  "scripts/bench-resources.mjs",
  "scripts/test-energy.mjs",
  "scripts/bench-energy.mjs",
  "scripts/test-reproduction.mjs",
  "scripts/bench-reproduction.mjs",
  "scripts/test-mutation.mjs",
  "scripts/bench-mutation.mjs",
  "scripts/test-predator-prey.mjs",
  "scripts/bench-predator-prey.mjs",
  "scripts/test-sensors.mjs",
  "scripts/bench-sensors.mjs"
)

$ExpectedPackageScripts = @(
  "dev",
  "build",
  "check:boundaries",
  "test",
  "test:rng",
  "test:world",
  "test:movement",
  "test:render-snapshot",
  "test:perf-metrics",
  "test:spatial-hash",
  "test:neighbor-query",
  "test:resources",
  "test:energy",
  "test:reproduction",
  "test:mutation",
  "test:predator-prey",
  "test:sensors",
  "bench:rng",
  "bench:world",
  "bench:movement",
  "bench:render-snapshot",
  "bench:perf-metrics",
  "bench:spatial-hash",
  "bench:neighbor-query",
  "bench:resources",
  "bench:energy",
  "bench:reproduction",
  "bench:mutation",
  "bench:predator-prey",
  "bench:sensors"
)

$AllExpectedFiles = @($CoreFiles + $SimFiles + $DocFiles + $ScriptFiles)
$MissingFiles = @()
foreach($Relative in $AllExpectedFiles){
  if(!(Test-Path (Join-Path $ProjectPath $Relative))){
    $MissingFiles += $Relative
  }
}

$PackageOk = $false
$PackageHasBom = $false
$PackageInfo = $null
$PackageScriptMissing = @()
$PackageScriptPresent = @()
$PackageParseError = ""
$PackagePath = Join-Path $ProjectPath "package.json"

if(Test-Path $PackagePath){
  $PackageHasBom = Test-HasUtf8Bom $PackagePath
  try {
    $RawPackage = [System.IO.File]::ReadAllText($PackagePath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
    $PackageInfo = $RawPackage | ConvertFrom-Json
    $PackageOk = $true
    foreach($ScriptName in $ExpectedPackageScripts){
      if($PackageInfo.scripts -and ($PackageInfo.scripts.PSObject.Properties.Name -contains $ScriptName)){
        $PackageScriptPresent += $ScriptName
      } else {
        $PackageScriptMissing += $ScriptName
      }
    }
  } catch {
    $PackageParseError = $_.Exception.Message
  }
} else {
  $PackageParseError = "package.json missing"
}

$BoundaryViolations = @()
$MathRandomHits = @()
$EntityClassHits = @()
$TodoHits = @()
$TypeScriptFiles = @()

if(Test-Path (Join-Path $ProjectPath "src")){
  $TypeScriptFiles = Get-ChildItem -Path (Join-Path $ProjectPath "src") -Recurse -File -Include *.ts,*.tsx | Sort-Object FullName
}

$ForbiddenImportPatterns = @(
  [pscustomobject]@{ name = "pixi in sim"; pattern = "from\s+['""]pixi\.js['""]|import\s+.*['""]pixi\.js['""]" },
  [pscustomobject]@{ name = "react in sim"; pattern = "from\s+['""]react['""]|import\s+.*['""]react['""]" },
  [pscustomobject]@{ name = "ui import in sim"; pattern = "from\s+['""]\.\./ui|from\s+['""]\./ui|from\s+['""]src/ui" },
  [pscustomobject]@{ name = "editor import in sim"; pattern = "from\s+['""]\.\./editor|from\s+['""]\./editor|from\s+['""]src/editor" },
  [pscustomobject]@{ name = "render import in sim"; pattern = "from\s+['""]\.\./render|from\s+['""]\./render|from\s+['""]src/render" }
)

$SimRoot = Join-Path $ProjectPath "src\sim"
if(Test-Path $SimRoot){
  $SimTsFiles = Get-ChildItem -Path $SimRoot -Recurse -File -Include *.ts,*.tsx | Sort-Object FullName
  foreach($File in $SimTsFiles){
    $Text = Read-TextSafe $File.FullName
    $Rel = Get-RelativeProjectPath $ProjectPath $File.FullName
    foreach($Rule in $ForbiddenImportPatterns){
      if($Text -match $Rule.pattern){
        $BoundaryViolations += [pscustomobject]@{ file = $Rel; rule = $Rule.name }
      }
    }
    if($Text -match "\bMath\.random\s*\("){
      $MathRandomHits += $Rel
    }
    if($Text -match "\bclass\s+Entity\b|\bnew\s+Entity\b"){
      $EntityClassHits += $Rel
    }
  }
}

foreach($File in $TypeScriptFiles){
  $Text = Read-TextSafe $File.FullName
  if($Text -match "TODO|FIXME|HACK"){
    $TodoHits += (Get-RelativeProjectPath $ProjectPath $File.FullName)
  }
}

$MetricNames = @()
$PerfPath = Join-Path $ProjectPath "src\shared\perfMetrics.ts"
if(Test-Path $PerfPath){
  $PerfText = Read-TextSafe $PerfPath
  $Regex = [regex]'["'']([a-zA-Z][a-zA-Z0-9]+)["'']'
  foreach($Match in $Regex.Matches($PerfText)){
    $Name = $Match.Groups[1].Value
    if($Name -match "Ms$|Count$|Candidates$|Agent$|MemoryMB$|Step$|01$|Transferred$|Damage$|Dealt$|Eaten$|Alive$|Cells$|Occupancy$|Ticks$|Births|Deaths|Kill|Attack|Sensor|Neighbor|Resource|Energy|Fitness|Generation"){
      $MetricNames += $Name
    }
  }
  $MetricNames = $MetricNames | Sort-Object -Unique
}

$TsLineCount = 0
foreach($File in $TypeScriptFiles){
  try {
    $TsLineCount += ([System.IO.File]::ReadAllLines($File.FullName)).Count
  } catch {}
}

$GitBranch = ""
$GitHead = ""
$GitStatus = ""
try {
  $GitBranch = (& git rev-parse --abbrev-ref HEAD 2>$null) -join "`n"
  $GitHead = (& git rev-parse --short HEAD 2>$null) -join "`n"
  $GitStatus = (& git status --short 2>$null) -join "`n"
} catch {}

$NpmResults = @()
if($RunNpmChecks){
  $NpmCommands = @(
    [pscustomobject]@{ name = "verify package.json"; command = "node -e ""const fs=require('fs'); const b=fs.readFileSync('package.json'); if(b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF) throw new Error('package.json has BOM'); JSON.parse(b.toString('utf8')); console.log('package.json ok, no BOM');""" },
    [pscustomobject]@{ name = "npm run test"; command = "npm run test" },
    [pscustomobject]@{ name = "npm run build"; command = "npm run build" },
    [pscustomobject]@{ name = "npm run bench:sensors"; command = "npm run bench:sensors" }
  )
  foreach($CommandSpec in $NpmCommands){
    $NpmResults += Invoke-CapturedCommand -Name $CommandSpec.name -Command $CommandSpec.command
  }
}

$Builder = New-Object System.Text.StringBuilder

[void]$Builder.AppendLine("qubok_evolve project state report")
[void]$Builder.AppendLine("Generated: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
[void]$Builder.AppendLine("Project:   " + $ProjectPath)
[void]$Builder.AppendLine("Mode:      " + ($(if($RunNpmChecks){ "scan + npm verification" } else { "scan only" })))

Add-Section $Builder "SUMMARY"
Add-KeyValue $Builder "package parse" ($(if($PackageOk){ "ok" } else { "failed: " + $PackageParseError }))
Add-KeyValue $Builder "package BOM" ($(if($PackageHasBom){ "BOM FOUND" } else { "no BOM / not present" }))
Add-KeyValue $Builder "package name" ($(if($PackageInfo){ $PackageInfo.name } else { "-" }))
Add-KeyValue $Builder "package version" ($(if($PackageInfo){ $PackageInfo.version } else { "-" }))
Add-KeyValue $Builder "expected files missing" $MissingFiles.Count
Add-KeyValue $Builder "missing package scripts" $PackageScriptMissing.Count
Add-KeyValue $Builder "boundary violations" $BoundaryViolations.Count
Add-KeyValue $Builder "Math.random hits in src/sim" $MathRandomHits.Count
Add-KeyValue $Builder "Entity class hits in src/sim" $EntityClassHits.Count
Add-KeyValue $Builder "TypeScript files" $TypeScriptFiles.Count
Add-KeyValue $Builder "TypeScript source lines" $TsLineCount
Add-KeyValue $Builder "metrics discovered" $MetricNames.Count
if($GitBranch -or $GitHead){
  Add-KeyValue $Builder "git branch" $GitBranch
  Add-KeyValue $Builder "git head" $GitHead
  Add-KeyValue $Builder "git dirty entries" ($(if([string]::IsNullOrWhiteSpace($GitStatus)){ 0 } else { ($GitStatus -split "`n").Count }))
}

Add-Section $Builder "NEXT-DEVELOPMENT READINESS"
if($MissingFiles.Count -eq 0 -and $PackageOk -and !$PackageHasBom -and $BoundaryViolations.Count -eq 0 -and $MathRandomHits.Count -eq 0 -and $EntityClassHits.Count -eq 0){
  [void]$Builder.AppendLine("status: green for next milestone")
} else {
  [void]$Builder.AppendLine("status: needs attention before next milestone")
}
[void]$Builder.AppendLine("")
[void]$Builder.AppendLine("Recommended next milestone after m15:")
[void]$Builder.AppendLine("- m16: sector aggregation hardening / food sector channels / threat-sector weighting")
[void]$Builder.AppendLine("- or m16: terrain material grid if you want to unlock environment constraints first")
[void]$Builder.AppendLine("- avoid: editor/body-grid/compiler until sensors + terrain + survival loop have stable benchmark baselines")

Add-Section $Builder "PACKAGE.JSON"
if($PackageOk){
  Add-KeyValue $Builder "name" $PackageInfo.name
  Add-KeyValue $Builder "version" $PackageInfo.version
  Add-KeyValue $Builder "type" $PackageInfo.type
  [void]$Builder.AppendLine("")
  [void]$Builder.AppendLine("scripts present:")
  foreach($Name in ($PackageScriptPresent | Sort-Object)){ [void]$Builder.AppendLine("  ok      " + $Name) }
  [void]$Builder.AppendLine("")
  [void]$Builder.AppendLine("scripts missing:")
  if($PackageScriptMissing.Count -eq 0){ [void]$Builder.AppendLine("  none") }
  foreach($Name in ($PackageScriptMissing | Sort-Object)){ [void]$Builder.AppendLine("  missing " + $Name) }
} else {
  [void]$Builder.AppendLine("package parse failed: " + $PackageParseError)
}

Add-FileAuditTable $Builder $CoreFiles $ProjectPath "CORE FILES"
Add-FileAuditTable $Builder $SimFiles $ProjectPath "SIM FILES"
Add-FileAuditTable $Builder $ScriptFiles $ProjectPath "TEST AND BENCH SCRIPTS"
Add-FileAuditTable $Builder $DocFiles $ProjectPath "DOC FILES"

Add-Section $Builder "SIM BOUNDARY SCAN"
if($BoundaryViolations.Count -eq 0){
  [void]$Builder.AppendLine("No forbidden imports detected in src/sim.")
} else {
  foreach($Violation in $BoundaryViolations){
    [void]$Builder.AppendLine(("violation: {0} :: {1}" -f $Violation.file, $Violation.rule))
  }
}

[void]$Builder.AppendLine("")
if($MathRandomHits.Count -eq 0){
  [void]$Builder.AppendLine("No Math.random() detected in src/sim.")
} else {
  [void]$Builder.AppendLine("Math.random() hits:")
  foreach($Hit in $MathRandomHits){ [void]$Builder.AppendLine("  " + $Hit) }
}

[void]$Builder.AppendLine("")
if($EntityClassHits.Count -eq 0){
  [void]$Builder.AppendLine("No class Entity/new Entity detected in src/sim.")
} else {
  [void]$Builder.AppendLine("Entity class hits:")
  foreach($Hit in $EntityClassHits){ [void]$Builder.AppendLine("  " + $Hit) }
}

Add-Section $Builder "PERF METRICS DISCOVERED"
if($MetricNames.Count -eq 0){
  [void]$Builder.AppendLine("No metric names discovered or src/shared/perfMetrics.ts missing.")
} else {
  foreach($Metric in $MetricNames){
    [void]$Builder.AppendLine("  " + $Metric)
  }
}

Add-Section $Builder "TODO / FIXME / HACK SCAN"
if($TodoHits.Count -eq 0){
  [void]$Builder.AppendLine("No TODO/FIXME/HACK markers detected in src.")
} else {
  foreach($Hit in ($TodoHits | Sort-Object -Unique)){
    [void]$Builder.AppendLine("  " + $Hit)
  }
}

Add-Section $Builder "GIT STATE"
if($GitBranch -or $GitHead){
  Add-KeyValue $Builder "branch" $GitBranch
  Add-KeyValue $Builder "head" $GitHead
  [void]$Builder.AppendLine("")
  if([string]::IsNullOrWhiteSpace($GitStatus)){
    [void]$Builder.AppendLine("git status --short: clean")
  } else {
    [void]$Builder.AppendLine("git status --short:")
    [void]$Builder.AppendLine($GitStatus)
  }
} else {
  [void]$Builder.AppendLine("Git not available or project is not a git repository.")
}

Add-Section $Builder "NPM VERIFICATION"
if(!$RunNpmChecks){
  [void]$Builder.AppendLine("Skipped. Re-run with -RunNpmChecks to capture:")
  [void]$Builder.AppendLine("  node package.json parse/no-BOM check")
  [void]$Builder.AppendLine("  npm run test")
  [void]$Builder.AppendLine("  npm run build")
  [void]$Builder.AppendLine("  npm run bench:sensors")
} else {
  foreach($Result in $NpmResults){
    [void]$Builder.AppendLine("")
    [void]$Builder.AppendLine(("--- {0} ---" -f $Result.name))
    [void]$Builder.AppendLine(("command:   {0}" -f $Result.command))
    [void]$Builder.AppendLine(("exitCode:  {0}" -f $Result.exitCode))
    [void]$Builder.AppendLine(("duration:  {0} ms" -f $Result.ms))
    [void]$Builder.AppendLine("")
    [void]$Builder.AppendLine($Result.output.TrimEnd())
  }
}

Add-Section $Builder "COMPACT CONTEXT FOR NEXT CHAT / NEXT PATCH"
[void]$Builder.AppendLine("Project: qubok_evolve")
[void]$Builder.AppendLine("Path: I:\Art\_AI\app_development\simulation\evolution")
[void]$Builder.AppendLine("Current milestone expected: 15")
[void]$Builder.AppendLine("Architecture invariants:")
[void]$Builder.AppendLine("- runtime state in typed arrays")
[void]$Builder.AppendLine("- no class Entity in hot loop")
[void]$Builder.AppendLine("- no React state for entity simulation")
[void]$Builder.AppendLine("- no Pixi imports in src/sim")
[void]$Builder.AppendLine("- deterministic RNG only; no Math.random in src/sim")
[void]$Builder.AppendLine("- each subsystem needs test and benchmark hook")
[void]$Builder.AppendLine("")
[void]$Builder.AppendLine("Milestones implemented by module names:")
foreach($File in $SimFiles){
  $State = if(Test-Path (Join-Path $ProjectPath $File)){ "ok" } else { "missing" }
  [void]$Builder.AppendLine(("- {0}: {1}" -f $State, $File))
}

$ReportText = $Builder.ToString()
Write-Utf8NoBom $ReportPath $ReportText

$JsonObject = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  projectPath = $ProjectPath
  packageOk = $PackageOk
  packageHasBom = $PackageHasBom
  packageName = $(if($PackageInfo){ $PackageInfo.name } else { $null })
  packageVersion = $(if($PackageInfo){ $PackageInfo.version } else { $null })
  missingFiles = $MissingFiles
  missingPackageScripts = $PackageScriptMissing
  boundaryViolations = $BoundaryViolations
  mathRandomHits = $MathRandomHits
  entityClassHits = $EntityClassHits
  typeScriptFileCount = $TypeScriptFiles.Count
  typeScriptLineCount = $TsLineCount
  metricNames = $MetricNames
  gitBranch = $GitBranch
  gitHead = $GitHead
  gitStatusShort = $GitStatus
  npmResults = $NpmResults
}
Write-Utf8NoBom $JsonPath (($JsonObject | ConvertTo-Json -Depth 16) + "`n")

Write-Host ""
Write-Host "qubok_evolve audit complete"
Write-Host "Report TXT: $ReportPath"
Write-Host "Report JSON: $JsonPath"
Write-Host ""

if($MissingFiles.Count -gt 0){
  Write-Host "Missing expected files: $($MissingFiles.Count)"
  $MissingFiles | ForEach-Object { Write-Host "  missing $_" }
}

if($BoundaryViolations.Count -gt 0){
  Write-Host "Boundary violations: $($BoundaryViolations.Count)"
}

if($MathRandomHits.Count -gt 0){
  Write-Host "Math.random hits in src/sim: $($MathRandomHits.Count)"
}

if($EntityClassHits.Count -gt 0){
  Write-Host "Entity class hits in src/sim: $($EntityClassHits.Count)"
}

if($RunNpmChecks){
  $Failed = @($NpmResults | Where-Object { $_.exitCode -ne 0 })
  if($Failed.Count -gt 0){
    Write-Host "NPM verification has failures: $($Failed.Count)"
    foreach($Failure in $Failed){ Write-Host "  failed $($Failure.name) exit=$($Failure.exitCode)" }
    exit 1
  }
}

if($OpenReport){
  Start-Process notepad.exe $ReportPath
}

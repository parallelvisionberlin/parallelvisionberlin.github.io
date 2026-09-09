param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$SourceCommit = '58bf92dbc5ecd7d1d7cb1f13fc522141ee7fb220'
$OriginalLocation = Get-Location
$PriorNoVcs = [Environment]::GetEnvironmentVariable('EAS_NO_VCS', 'Process')
$PriorRoot = [Environment]::GetEnvironmentVariable('EAS_PROJECT_ROOT', 'Process')
$Mutex = [System.Threading.Mutex]::new($false, 'ParallelVision_BRIDGE01_Build')
$Held = $false
$Packaging = $false
function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE)." }
}
try {
    $Held = $Mutex.WaitOne(0)
    if (!$Held) { throw 'Another app build is running. Use that window.' }
    foreach ($Tool in @('git.exe', 'node.exe', 'npm.cmd', 'npx.cmd', 'eas.cmd', 'tar.exe')) {
        if (!(Get-Command $Tool -ErrorAction SilentlyContinue)) { throw "Required command missing: $Tool" }
    }
    $Version = (& node.exe --version)
    if ($LASTEXITCODE -ne 0 -or [version]$Version.TrimStart('v') -lt [version]'22.13.0') { throw 'Node 22.13 or newer is required.' }
    Set-Location $PSScriptRoot
    $Repository = (& git.exe rev-parse --show-toplevel)
    if ($LASTEXITCODE -ne 0) { throw 'Run this from the Parallel Vision mobile-app folder.' }
    $Origin = (& git.exe -C $Repository remote get-url origin)
    if ($LASTEXITCODE -ne 0 -or $Origin -notmatch 'github\.com[:/]parallelvisionberlin/parallelvisionberlin\.github\.io(?:\.git)?$') { throw 'Unexpected repository.' }
    Invoke-Checked 'git.exe' @('-C', $Repository, 'fetch', 'origin', 'mobile-app-v1')
    Invoke-Checked 'git.exe' @('-C', $Repository, 'cat-file', '-e', "${SourceCommit}^{commit}")
    & git.exe -C $Repository diff --quiet $SourceCommit FETCH_HEAD -- mobile-app/App.js mobile-app/src mobile-app/assets mobile-app/tests mobile-app/app.json mobile-app/eas.json mobile-app/package.json mobile-app/package-lock.json mobile-app/.easignore mobile-app/.npmrc
    if ($LASTEXITCODE -ne 0) { throw 'Newer app code exists. Stopped rather than building an old design.' }
    $Name = 'SITECOHESION05_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + ([guid]::NewGuid().ToString('N').Substring(0, 6))
    $Workspace = Join-Path (Join-Path $env:LOCALAPPDATA 'ParallelVision\Builds') $Name
    New-Item -ItemType Directory -Path $Workspace -Force | Out-Null
    $Archive = Join-Path $Workspace 'source.tar'
    Invoke-Checked 'git.exe' @('-C', $Repository, 'archive', '--format=tar', "--output=$Archive", $SourceCommit, 'mobile-app')
    Invoke-Checked 'tar.exe' @('-xf', $Archive, '-C', $Workspace)
    $App = Join-Path $Workspace 'mobile-app'
    Set-Location $App
    $Utf8 = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText((Join-Path $App '.gitignore'), [IO.File]::ReadAllText((Join-Path $App '.easignore')), $Utf8)
    [IO.File]::WriteAllText((Join-Path $App 'BUILD_SOURCE.txt'), "SITE COHESION 05`nSource: $SourceCommit`n", $Utf8)
    if (![IO.File]::ReadAllText((Join-Path $App 'App.js')).Contains('SITE COHESION / 05')) { throw 'SITE COHESION 05 marker is missing.' }
    $Required = @('App.js', 'app.json', 'eas.json', 'package.json', 'package-lock.json', '.easignore', '.npmrc', 'BUILD_SOURCE.txt')
    foreach ($Folder in @('src', 'assets', 'tests')) {
        foreach ($File in @(Get-ChildItem -LiteralPath (Join-Path $App $Folder) -Recurse -File -Force)) {
            $Required += $File.FullName.Substring($App.Length + 1)
        }
    }
    $Hashes = @{}
    foreach ($Relative in $Required) { $Hashes[$Relative] = (Get-FileHash -LiteralPath (Join-Path $App $Relative) -Algorithm SHA256).Hash }
    Write-Host 'SITE COHESION 05: checking exact app source and iOS export.' -ForegroundColor Cyan
    Invoke-Checked 'npx.cmd' @('--yes', 'npm@10.9.8', 'ci', '--include=dev', '--ignore-scripts')
    Invoke-Checked 'npm.cmd' @('test')
    Invoke-Checked 'npx.cmd' @('expo', 'export', '--platform', 'ios', '--output-dir', (Join-Path $Workspace 'ios-check'))
    foreach ($Relative in $Required) {
        if ((Get-FileHash -LiteralPath (Join-Path $App $Relative) -Algorithm SHA256).Hash -ne $Hashes[$Relative]) { throw "Source changed during checks: $Relative" }
    }
    $Packaging = $true
    $env:EAS_NO_VCS = '1'
    $env:EAS_PROJECT_ROOT = $App
    $Inspection = Join-Path $Workspace 'archive-check'
    Invoke-Checked 'eas.cmd' @('build:inspect', '--platform', 'ios', '--profile', 'preview', '--stage', 'archive', '--output', $Inspection)
    $Root = $Inspection
    if (!(Test-Path (Join-Path $Root 'App.js')) -and (Test-Path (Join-Path $Root 'mobile-app\App.js'))) { $Root = Join-Path $Root 'mobile-app' }
    foreach ($Relative in $Required) {
        $File = Join-Path $Root $Relative
        if (!(Test-Path -LiteralPath $File -PathType Leaf)) { throw "Required file missing from upload: $Relative" }
        if ((Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash -ne $Hashes[$Relative]) { throw "Upload does not match checked file: $Relative" }
    }
    $Files = @(Get-ChildItem -LiteralPath $Inspection -File -Recurse -Force)
    $Prefix = [IO.Path]::GetFullPath($Inspection).TrimEnd([char[]]'\/') + [IO.Path]::DirectorySeparatorChar
    foreach ($File in $Files) {
        $Relative = $File.FullName.Substring($Prefix.Length).Replace('\', '/')
        if ($Relative -match '(^|/)(node_modules|\.git)(/|$)|(^|/)\.env(?:\.|$)|(^|/)credentials\.json$|\.(sql|p8|p12)$|\.before-|\.backup') { throw "Unnecessary or sensitive upload file: $Relative" }
    }
    $Bytes = ($Files | Measure-Object -Property Length -Sum).Sum
    if ($Bytes -gt 50MB) { throw 'Upload archive is unexpectedly large. No build started.' }
    Write-Host 'SITE COHESION 05: source and upload archive verified.' -ForegroundColor Green
    Write-Host ('Upload size before compression: {0:N2} MB' -f ($Bytes / 1MB))
    Write-Host "Source: $SourceCommit"
    if (!$CheckOnly) {
        Write-Host 'Building one iPhone preview. Apple login / reuse profile: Yes.' -ForegroundColor Cyan
        Invoke-Checked 'eas.cmd' @('build', '--platform', 'ios', '--profile', 'preview')
        Write-Host 'Install from THIS build link over the current app. PROFILE must show SITE COHESION / 05.' -ForegroundColor Green
    }
} catch {
    Write-Host ("STOP: " + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'Copy the final output. Do not start another build separately.' -ForegroundColor Yellow
    exit 1
} finally {
    if ($Packaging) {
        [Environment]::SetEnvironmentVariable('EAS_NO_VCS', $PriorNoVcs, 'Process')
        [Environment]::SetEnvironmentVariable('EAS_PROJECT_ROOT', $PriorRoot, 'Process')
    }
    Set-Location $OriginalLocation
    if ($Held) { $Mutex.ReleaseMutex() }
    $Mutex.Dispose()
}
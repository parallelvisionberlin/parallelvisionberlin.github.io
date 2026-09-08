param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$SourceCommit = 'efc7f31ae0b58d23139c604820100c7483826341'
$OriginalLocation = Get-Location
$PreviousNoVcs = [Environment]::GetEnvironmentVariable('EAS_NO_VCS', 'Process')
$PreviousProjectRoot = [Environment]::GetEnvironmentVariable('EAS_PROJECT_ROOT', 'Process')
$Mutex = [System.Threading.Mutex]::new($false, 'ParallelVision_BRIDGE01_Build')
$Held = $false
$PackagingEnvironmentSet = $false

function Invoke-Checked {
    param([string]$Program, [string[]]$ArgumentList)
    & $Program @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "$Program failed (exit $LASTEXITCODE). No further build was started."
    }
}

try {
    $Held = $Mutex.WaitOne(0)
    if (!$Held) { throw 'Another BRIDGE 01 preparation is running. Use that window.' }
    foreach ($Tool in @('git.exe', 'node.exe', 'npm.cmd', 'npx.cmd', 'eas.cmd', 'tar.exe')) {
        if (!(Get-Command $Tool -ErrorAction SilentlyContinue)) { throw "Required command not found: $Tool" }
    }
    Set-Location $PSScriptRoot
    $Repository = (& git.exe rev-parse --show-toplevel)
    if ($LASTEXITCODE -ne 0) { throw 'Run this script from the Parallel Vision mobile-app folder.' }
    $Origin = (& git.exe -C $Repository remote get-url origin)
    if ($LASTEXITCODE -ne 0 -or $Origin -notmatch 'github\.com[:/]parallelvisionberlin/parallelvisionberlin\.github\.io(?:\.git)?$') {
        throw 'This is not the expected Parallel Vision repository.'
    }
    $NodeVersion = (& node.exe --version)
    $NodeMajor = [int]($NodeVersion.TrimStart('v').Split('.')[0])
    if ($LASTEXITCODE -ne 0 -or [int]$NodeMajor -lt 22) { throw 'This Expo app requires Node 22 or newer.' }
    Invoke-Checked 'git.exe' @('-C', $Repository, 'fetch', 'origin', 'mobile-app-v1')
    Invoke-Checked 'git.exe' @('-C', $Repository, 'cat-file', '-e', "${SourceCommit}^{commit}")

    # Read only committed, tested app files. Do not overwrite local edits or copy the website.
    $Builds = Join-Path $env:LOCALAPPDATA 'ParallelVision\Builds'
    $Name = 'BRIDGE01_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + ([guid]::NewGuid().ToString('N').Substring(0, 6))
    $Workspace = Join-Path $Builds $Name
    New-Item -ItemType Directory -Path $Workspace -Force | Out-Null
    $SourceArchive = Join-Path $Workspace 'source.tar'
    Invoke-Checked 'git.exe' @('-C', $Repository, 'archive', '--format=tar', "--output=$SourceArchive", $SourceCommit, 'mobile-app')
    Invoke-Checked 'tar.exe' @('-xf', $SourceArchive, '-C', $Workspace)
    $App = Join-Path $Workspace 'mobile-app'
    Set-Location $App
    $Utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Join-Path $App '.gitignore'), [System.IO.File]::ReadAllText((Join-Path $App '.easignore')), $Utf8)
    [System.IO.File]::WriteAllText((Join-Path $App 'BUILD_SOURCE.txt'), "BRIDGE 01`nSource: $SourceCommit`n", $Utf8)
    $Auth = [System.IO.File]::ReadAllText((Join-Path $App 'src\AuthPanel.js'))
    if (!$Auth.Contains('LOGIN 03 / BRIDGE 01')) { throw 'The snapshot does not contain BRIDGE 01.' }
    $Required = @('App.js', 'src\AuthPanel.js', 'src\NinaLiveModal.js', 'src\ninaBridge.js', 'src\config.js', 'src\theme.js', 'app.json', 'eas.json', 'package.json', 'package-lock.json', 'assets\icon.png', '.easignore', '.npmrc', 'BUILD_SOURCE.txt')
    $Hashes = @{}
    foreach ($Relative in $Required) {
        $File = Join-Path $App $Relative
        if (!(Test-Path -LiteralPath $File -PathType Leaf)) { throw "Required snapshot file is missing: $Relative" }
        $Hashes[$Relative] = (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash
    }
    # Keep a local provenance commit. EAS must copy files, not clone this repository.
    Invoke-Checked 'git.exe' @('init')
    Invoke-Checked 'git.exe' @('add', '.')
    Invoke-Checked 'git.exe' @('-c', 'user.name=Parallel Vision local build', '-c', 'user.email=pv-build@localhost', 'commit', '-m', "BRIDGE 01 from $SourceCommit")

    Write-Host "`nBRIDGE 01: checking the pinned dependency lock and iOS code." -ForegroundColor Cyan
    Invoke-Checked 'npx.cmd' @('--yes', 'npm@10.9.8', 'ci', '--include=dev', '--ignore-scripts')
    Invoke-Checked 'npm.cmd' @('test')
    Invoke-Checked 'npx.cmd' @('expo', 'export', '--platform', 'ios', '--output-dir', (Join-Path $Workspace 'ios-javascript-check'))
    foreach ($Relative in $Required) {
        if ((Get-FileHash -LiteralPath (Join-Path $App $Relative) -Algorithm SHA256).Hash -ne $Hashes[$Relative]) {
            throw "A tested file changed during preparation: $Relative"
        }
    }

    # ARCHIVE 02: GitClient shallow-clones .git into the EAS staging directory.
    # Use EAS's NoVcs file-copy path for BOTH inspection and upload. That path
    # excludes .git and node_modules by default, and still honors .easignore.
    # Scope these variables to this script process and restore them in finally.
    $PackagingEnvironmentSet = $true
    $env:EAS_NO_VCS = '1'
    $env:EAS_PROJECT_ROOT = $App
    Write-Host 'ARCHIVE 02: packaging only the verified app, without Git metadata.' -ForegroundColor Cyan

    $Inspection = Join-Path $Workspace 'archive-check'
    Invoke-Checked 'eas.cmd' @('build:inspect', '--platform', 'ios', '--profile', 'preview', '--stage', 'archive', '--output', $Inspection)
    $ArchiveRoot = $Inspection
    if (!(Test-Path (Join-Path $ArchiveRoot 'App.js')) -and (Test-Path (Join-Path $ArchiveRoot 'mobile-app\App.js'))) {
        $ArchiveRoot = Join-Path $ArchiveRoot 'mobile-app'
    }
    foreach ($Relative in $Required) {
        $File = Join-Path $ArchiveRoot $Relative
        if (!(Test-Path -LiteralPath $File -PathType Leaf)) { throw "EAS excluded a required file: $Relative" }
        if ((Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash -ne $Hashes[$Relative]) { throw "EAS archive file mismatch: $Relative" }
    }
    $Files = @(Get-ChildItem -LiteralPath $Inspection -Recurse -File -Force)
    $InspectionPrefix = [System.IO.Path]::GetFullPath($Inspection).TrimEnd([char[]]'\/') + [System.IO.Path]::DirectorySeparatorChar
    foreach ($File in $Files) {
        $Normalized = $File.FullName.Substring($InspectionPrefix.Length).Replace('\', '/')
        if ($Normalized -match '(^|/)(node_modules|\.git)(/|$)|(^|/)\.env(?:\.|$)|(^|/)credentials\.json$|\.(sql|p8|p12)$|\.before-|\.backup') {
            throw "Unnecessary or sensitive file in the upload archive: $Normalized"
        }
    }
    $Bytes = ($Files | Measure-Object -Property Length -Sum).Sum
    if ($Bytes -gt 50MB) { throw 'The app archive is unexpectedly large. Stopped before uploading.' }

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $Live = Invoke-WebRequest -UseBasicParsing -TimeoutSec 30 -Uri ('https://parallelvisionlabel.com/nina-app.html?bridge_check=' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
    if (!$Live.Content.Contains('data-pv-app-revision="bridge01"')) { throw 'The matching live page is not deployed yet. No build was started.' }
    Write-Host "`nOK: LOGIN 03 / BRIDGE 01. Code, icon and archive verified." -ForegroundColor Green
    Write-Host ('Upload source: {0:N2} MB before compression.' -f ($Bytes / 1MB)) -ForegroundColor Green
    Write-Host "Source commit: $SourceCommit"
    Write-Host "Build folder: $App"
    Write-Host 'Your original local files have not been overwritten.'
    if (!$CheckOnly) {
        Write-Host 'Building the new iPhone preview. Apple login / reuse profile: Yes.' -ForegroundColor Cyan
        Invoke-Checked 'eas.cmd' @('build', '--platform', 'ios', '--profile', 'preview')
        Write-Host 'Install only the link from this build. Profile must show LOGIN 03 / BRIDGE 01.' -ForegroundColor Green
    }
} catch {
    Write-Host ("`nSTOP: " + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'Copy this error. Do not start another build separately.' -ForegroundColor Yellow
    exit 1
} finally {
    if ($PackagingEnvironmentSet) {
        [Environment]::SetEnvironmentVariable('EAS_NO_VCS', $PreviousNoVcs, 'Process')
        [Environment]::SetEnvironmentVariable('EAS_PROJECT_ROOT', $PreviousProjectRoot, 'Process')
    }
    Set-Location $OriginalLocation
    if ($Held) { $Mutex.ReleaseMutex() }
    $Mutex.Dispose()
}

# Parallel Vision: prepare and build the LOGIN 02 preview.
# Runs on Windows PowerShell 5.1. Backs up local files before targeted updates.
[CmdletBinding()]
param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
$codeCommit = '2c99e2bf276f02301a24d7c3f6dd65efaa53e755'
$originalLocation = Get-Location
$backup = $null

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Program failed (exit $LASTEXITCODE). Stopped before the next step."
    }
}

function Assert-AppFiles {
    param([string]$Folder)
    if (-not (Test-Path -LiteralPath (Join-Path $Folder 'assets\icon.png') -PathType Leaf)) {
        throw 'The preview archive is missing assets/icon.png. No cloud build was started.'
    }
    foreach ($relative in @('App.js', 'src\AuthPanel.js')) {
        $packed = Join-Path $Folder $relative
        $local = Join-Path $PSScriptRoot $relative
        if (-not (Test-Path -LiteralPath $packed -PathType Leaf)) {
            throw "The preview archive is missing $relative. No cloud build was started."
        }
        if ((Get-FileHash -LiteralPath $packed).Hash -ne (Get-FileHash -LiteralPath $local).Hash) {
            throw "The preview archive has a different $relative. No cloud build was started."
        }
    }
}

try {
    Set-Location -LiteralPath $PSScriptRoot
    foreach ($program in @('git.exe', 'node.exe', 'npm.cmd', 'npx.cmd', 'eas.cmd')) {
        if (-not (Get-Command $program -ErrorAction SilentlyContinue)) {
            throw "Required command not found: $program"
        }
    }
    $branch = & git.exe branch --show-current
    if ($LASTEXITCODE -ne 0 -or $branch.Trim() -ne 'mobile-app-v1') {
        throw 'Run this script in the mobile-app-v1 branch. Nothing has been changed.'
    }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backup = Join-Path $env:LOCALAPPDATA "ParallelVision\Backups\login02-$stamp"
    New-Item -ItemType Directory -Path $backup -Force | Out-Null
    foreach ($relative in @('App.js', 'src\AuthPanel.js', 'package.json', 'package-lock.json', 'app.json', 'eas.json')) {
        $source = Join-Path $PSScriptRoot $relative
        if (Test-Path -LiteralPath $source -PathType Leaf) {
            $destination = Join-Path $backup $relative
            New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
            Copy-Item -LiteralPath $source -Destination $destination -Force
        }
    }
    $rootIgnore = Join-Path (Split-Path $PSScriptRoot -Parent) '.easignore'
    if (Test-Path -LiteralPath $rootIgnore -PathType Leaf) {
        Copy-Item -LiteralPath $rootIgnore -Destination (Join-Path $backup 'root.easignore') -Force
    }
    Write-Host "Local backup: $backup"

    Write-Host '[1/5] Loading the reviewed LOGIN 02 files...'
    Invoke-Checked 'git.exe' @('fetch', 'origin', 'mobile-app-v1')
    Invoke-Checked 'git.exe' @('restore', "--source=$codeCommit", '--worktree', '--', 'App.js', 'src/AuthPanel.js', '../.easignore')
    $authSource = Get-Content -LiteralPath '.\src\AuthPanel.js' -Raw
    if (-not $authSource.Contains("AUTH_REVISION = 'LOGIN 02'")) { throw 'LOGIN 02 source was not loaded.' }
    if (-not (Test-Path -LiteralPath '.\assets\icon.png' -PathType Leaf)) { throw 'assets/icon.png is missing locally.' }
    $appConfig = Get-Content -LiteralPath '.\app.json' -Raw | ConvertFrom-Json
    if ($appConfig.expo.scheme -notcontains 'parallelvision') { throw 'app.json must include the parallelvision URL scheme.' }
    $easConfig = Get-Content -LiteralPath '.\eas.json' -Raw | ConvertFrom-Json
    if ($easConfig.build.preview.distribution -ne 'internal' -or $easConfig.build.preview.developmentClient -eq $true) {
        throw 'The preview profile must be internal distribution without developmentClient.'
    }

    Write-Host '[2/5] Installing the Google sign-in browser dependencies for this Expo SDK...'
    Invoke-Checked 'npx.cmd' @('expo', 'install', 'expo-auth-session', 'expo-web-browser', 'expo-crypto')
    Write-Host '[3/5] Checking a clean dependency install...'
    Invoke-Checked 'npm.cmd' @('ci', '--include=dev')

    $checkRoot = Join-Path $env:TEMP "pv-login02-$stamp"
    New-Item -ItemType Directory -Path $checkRoot -Force | Out-Null
    Write-Host '[4/5] Checking the iOS JavaScript bundle before uploading...'
    Invoke-Checked 'npx.cmd' @('expo', 'export', '--platform', 'ios', '--output-dir', (Join-Path $checkRoot 'bundle'))

    Write-Host '[5/5] Inspecting the exact files EAS will upload...'
    $archivePath = Join-Path $checkRoot 'archive'
    Invoke-Checked 'eas.cmd' @('build:inspect', '--platform', 'ios', '--profile', 'preview', '--stage', 'archive', '--output', $archivePath)
    $appFolder = $null
    foreach ($manifest in @(Get-ChildItem -LiteralPath $archivePath -Filter 'package.json' -File -Recurse)) {
        try { $manifestData = Get-Content -LiteralPath $manifest.FullName -Raw | ConvertFrom-Json }
        catch { continue }
        if ($manifestData.name -eq 'parallel-vision-mobile') {
            $appFolder = $manifest.DirectoryName
            break
        }
    }
    if (-not $appFolder) {
        throw "Could not find the mobile app in the inspected archive at $archivePath. No cloud build was started."
    }
    Assert-AppFiles $appFolder
    Write-Host 'Local checks passed. These checks do not test Apple signing or real Google/Nina sessions.'
    Write-Host 'Clerk mobile callback required: parallelvision://sso-callback'
    if ($CheckOnly) {
        Write-Host 'CheckOnly: no cloud build was started.'
    } else {
        Write-Host 'Starting ONE iOS preview build. Answer Yes to Apple login/profile reuse when asked.'
        Invoke-Checked 'eas.cmd' @('build', '--platform', 'ios', '--profile', 'preview')
    }
} catch {
    Write-Host ''
    Write-Host ('STOP: ' + $_.Exception.Message)
    if ($backup) { Write-Host "Your backup is at: $backup" }
    Write-Host 'Send the error above. Do not manually repeat the build.'
    exit 1
} finally {
    Set-Location $originalLocation
}

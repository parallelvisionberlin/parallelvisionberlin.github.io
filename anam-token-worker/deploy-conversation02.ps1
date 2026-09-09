param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$SourceCommit = 'c56d9c4c0dd540dc0bfb2f8f40c8d7a9c2f06f6c'
$Revision = 'conversation02-worker01'
$OriginalLocation = Get-Location
$Mutex = [System.Threading.Mutex]::new($false, 'ParallelVision_Conversation02_WorkerDeploy')
$Held = $false
$UploadAttempted = $false
function Invoke-Checked {
    param([string]$Program, [string[]]$ArgumentList)
    & $Program @ArgumentList
    if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE)." }
}
try {
    $Held = $Mutex.WaitOne(0)
    if (!$Held) { throw 'Another Conversation 02 Worker deployment is running. Use that window.' }
    foreach ($Tool in @('git.exe', 'node.exe', 'npm.cmd', 'npx.cmd', 'tar.exe')) {
        if (!(Get-Command $Tool -ErrorAction SilentlyContinue)) { throw "Required command not found: $Tool" }
    }
    if ($env:CLOUDFLARE_ENV) { throw 'A named Cloudflare environment is selected. Use a new shell without CLOUDFLARE_ENV.' }
    $NodeVersion = (& node.exe --version)
    if ($LASTEXITCODE -ne 0 -or [version]$NodeVersion.TrimStart('v') -lt [version]'22.13.0') { throw 'Node 22.13 or newer is required.' }
    Set-Location $PSScriptRoot
    $Repository = (& git.exe rev-parse --show-toplevel)
    if ($LASTEXITCODE -ne 0) { throw 'Run this script from the Parallel Vision anam-token-worker folder.' }
    $Origin = (& git.exe -C $Repository remote get-url origin)
    if ($LASTEXITCODE -ne 0 -or $Origin -notmatch 'github\.com[:/]parallelvisionberlin/parallelvisionberlin\.github\.io(?:\.git)?$') { throw 'Unexpected repository.' }
    Invoke-Checked 'git.exe' @('-C', $Repository, 'fetch', 'origin', 'main')
    Invoke-Checked 'git.exe' @('-C', $Repository, 'cat-file', '-e', "${SourceCommit}^{commit}")
    & git.exe -C $Repository diff --quiet $SourceCommit FETCH_HEAD -- anam-token-worker/src anam-token-worker/wrangler.toml anam-token-worker/package.json anam-token-worker/pnpm-lock.yaml
    if ($LASTEXITCODE -ne 0) { throw 'Newer Worker code exists. Deployment stopped so it cannot overwrite another update.' }
    $Name = 'CONVERSATION02_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + ([guid]::NewGuid().ToString('N').Substring(0, 6))
    $Workspace = Join-Path (Join-Path $env:LOCALAPPDATA 'ParallelVision\WorkerDeploys') $Name
    New-Item -ItemType Directory -Path $Workspace -Force | Out-Null
    $Archive = Join-Path $Workspace 'source.tar'
    Invoke-Checked 'git.exe' @('-C', $Repository, 'archive', '--format=tar', "--output=$Archive", $SourceCommit, 'anam-token-worker')
    Invoke-Checked 'tar.exe' @('-xf', $Archive, '-C', $Workspace)
    $Worker = Join-Path $Workspace 'anam-token-worker'
    Set-Location $Worker
    $ConfigPath = Join-Path $Worker 'wrangler.toml'
    $Config = [IO.File]::ReadAllText($ConfigPath)
    if ($Config -notmatch '(?m)^name\s*=\s*"parallel-vision-anam-token"\s*$') { throw 'Worker target mismatch.' }
    if (![IO.File]::ReadAllText((Join-Path $Worker 'src\conversation-runtime.js')).Contains($Revision)) { throw 'Worker revision missing.' }
    # A local binding change may be intentional. Do not silently replace it.
    $LocalConfigPath = Join-Path (Join-Path $Repository 'anam-token-worker') 'wrangler.toml'
    if (Test-Path -LiteralPath $LocalConfigPath) {
        $LocalConfig = [IO.File]::ReadAllText($LocalConfigPath).Replace("`r`n", "`n").Trim()
        if ($LocalConfig -ne $Config.Replace("`r`n", "`n").Trim()) { throw 'Your local Worker configuration differs from the reviewed configuration. No deployment started. Send this message, not your secrets.' }
    }
    $Checked = @(Get-ChildItem -LiteralPath (Join-Path $Worker 'src') -File -Recurse)
    foreach ($Relative in @('package.json', 'pnpm-lock.yaml', 'wrangler.toml')) { $Checked += Get-Item -LiteralPath (Join-Path $Worker $Relative) }
    $Hashes = @{}
    foreach ($File in $Checked) { $Hashes[$File.FullName] = (Get-FileHash -LiteralPath $File.FullName -Algorithm SHA256).Hash }
    Write-Host 'CONVERSATION 02: installing locked dependencies and testing the Worker.' -ForegroundColor Cyan
    Invoke-Checked 'npx.cmd' @('--yes', 'pnpm@10.15.1', 'install', '--frozen-lockfile', '--ignore-scripts')
    Invoke-Checked 'npm.cmd' @('run', 'check')
    Invoke-Checked 'node.exe' @('--check', 'src/conversation-runtime.js')
    Invoke-Checked 'node.exe' @('--test', 'test/conversation02.test.js', 'test/startup.test.js')
    Invoke-Checked 'npx.cmd' @('--yes', 'pnpm@10.15.1', 'exec', 'wrangler', 'deploy', '--config', $ConfigPath, '--dry-run', '--outdir', (Join-Path $Workspace 'bundle-check'))
    foreach ($FilePath in $Hashes.Keys) {
        if ((Get-FileHash -LiteralPath $FilePath -Algorithm SHA256).Hash -ne $Hashes[$FilePath]) { throw 'Reviewed source or configuration changed during preparation. Deployment stopped.' }
    }
    Write-Host "OK: Worker checks passed. Source $SourceCommit" -ForegroundColor Green
    Write-Host 'No local source overwritten. No database migrations, phone build or audio change.'
    if (!$CheckOnly) {
        Write-Host 'Deploying only the Worker. Approve Cloudflare login if requested.' -ForegroundColor Cyan
        $UploadAttempted = $true
        Invoke-Checked 'npx.cmd' @('--yes', 'pnpm@10.15.1', 'exec', 'wrangler', 'deploy', '--config', $ConfigPath, '--keep-vars')
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $Confirmed = $false
        for ($Attempt = 0; $Attempt -lt 6; $Attempt++) {
            if ($Attempt) { Start-Sleep -Seconds 3 }
            try {
                $Result = Invoke-RestMethod -Method Get -TimeoutSec 15 -Headers @{ Origin = 'https://parallelvisionlabel.com'; 'Cache-Control' = 'no-cache' } -Uri ('https://parallel-vision-anam-token.parallelvision.workers.dev/api/nina/runtime-version?check=' + [guid]::NewGuid().ToString('N'))
                if ($Result.runtimeRevision -eq $Revision) { $Confirmed = $true; break }
            } catch { }
        }
        if (!$Confirmed) { throw 'The upload completed, but the live revision could not be verified. Do not deploy again; send the final output.' }
        Write-Host "LIVE VERIFIED: $Revision" -ForegroundColor Green
        Write-Host 'Close the current Nina conversation and start a new one. Do not reinstall the app or change your Anam prompt.'
    }
} catch {
    Write-Host ("STOP: " + $_.Exception.Message) -ForegroundColor Red
    if ($UploadAttempted) { Write-Host 'A deployment was attempted. Do not start another one until this output has been checked.' -ForegroundColor Yellow }
    else { Write-Host 'No live Worker deployment was started.' -ForegroundColor Yellow }
    exit 1
} finally {
    Set-Location $OriginalLocation
    if ($Held) { $Mutex.ReleaseMutex() }
    $Mutex.Dispose()
}

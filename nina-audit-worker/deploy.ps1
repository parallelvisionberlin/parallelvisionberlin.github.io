$ErrorActionPreference = 'Stop'
# Standalone read connector only. Never deploys the live-call Worker or changes D1.
Push-Location -LiteralPath $PSScriptRoot
try {
    Write-Host 'Installing the Nina read-only connection. Live Nina and the app are not redeployed.'
    & npm.cmd ci --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Stop here.' }
    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) { throw 'Syntax checks failed. Stop here.' }
    if (-not (Test-Path -LiteralPath 'wrangler.deploy.json')) {
        Copy-Item -LiteralPath 'wrangler.template.json' -Destination 'wrangler.deploy.json'
    }
    & npx.cmd wrangler deploy --config wrangler.deploy.json --keep-vars
    if ($LASTEXITCODE -ne 0) { throw 'Reader deployment failed.' }
    Write-Host ''
    Write-Host 'Reader deployed. Add this connection in ChatGPT and select OAuth:'
    Write-Host 'https://parallel-vision-nina-audit.parallelvision.workers.dev/mcp'
    Write-Host 'Approve using your existing Nina owner login. Do not paste a password or API key into chat.'
    Write-Host 'Keep wrangler.deploy.json: it contains the new OAuth KV binding, not transcript data or keys.'
} finally { Pop-Location }

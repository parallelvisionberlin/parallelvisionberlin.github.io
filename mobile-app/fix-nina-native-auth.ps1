$ErrorActionPreference = 'Stop'

$path = Join-Path $PSScriptRoot 'App.js'
if (!(Test-Path $path)) { throw "App.js not found at $path" }

$c = Get-Content $path -Raw
$backup = "$path.before-native-auth-fix"
Copy-Item $path $backup -Force

$oldMessage = "if(data.type==='PV_NINA_AUTH_REQUIRED'){loadedRef.current=true;setState('SIGN IN REQUIRED');setError('Your app account is signed in, but the live page has not accepted its session.');}"
$newMessage = "if(data.type==='PV_NINA_AUTH_REQUIRED'){loadedRef.current=true;onSignIn();return;}"
if (!$c.Contains($oldMessage)) { throw 'STOP: expected PV_NINA_AUTH_REQUIRED handler was not found. App.js was not changed.' }
$c = $c.Replace($oldMessage, $newMessage)

$oldNav = "onShouldStartLoadWithRequest={request => request.isTopFrame === false || request.url === 'about:blank' || isLivePage(request.url)}"
$newNav = @"
onShouldStartLoadWithRequest={request => {
            if (request.isTopFrame === false || request.url === 'about:blank' || isLivePage(request.url)) return true;
            try {
              const target = new URL(request.url);
              if (target.hostname.includes('clerk') || target.hostname.includes('google')) {
                onSignIn();
                return false;
              }
            } catch {}
            return false;
          }}
"@
if (!$c.Contains($oldNav)) { throw 'STOP: expected WebView navigation rule was not found. App.js was not changed.' }
$c = $c.Replace($oldNav, $newNav.Trim())

$c = $c.Replace("v=20260908-login02", "v=20260908-login03")

Set-Content -Path $path -Value $c -Encoding UTF8

$check = Get-Content $path -Raw
if ($check.Contains("Your app account is signed in, but the live page has not accepted its session.")) { throw 'STOP: old auth trap still exists.' }
if (!$check.Contains("onSignIn();return;")) { throw 'STOP: native auth handoff was not installed.' }
if (!$check.Contains("target.hostname.includes('clerk')")) { throw 'STOP: Clerk navigation handoff was not installed.' }

Write-Host ''
Write-Host 'OK: Nina web auth now hands off to the native PROFILE instead of trapping the user in the WebView.' -ForegroundColor Green
Write-Host 'OK: Google/Clerk navigation inside Nina is blocked from becoming an in-app browser.' -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Next command:' -ForegroundColor Cyan
Write-Host 'eas.cmd build --platform ios --profile preview' -ForegroundColor White
